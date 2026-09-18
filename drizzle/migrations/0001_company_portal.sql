-- Firemné účty (B2B) --------------------------------------------------------
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ico text,
  email_domain text NOT NULL,
  billing_email text NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true,
  monthly_ride_limit integer NOT NULL DEFAULT 40,
  monthly_amount_limit numeric NOT NULL DEFAULT 200,
  per_ride_limit numeric NOT NULL DEFAULT 10,
  workdays_only boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_email text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','hr')),
  active boolean NOT NULL DEFAULT true,
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone
);
CREATE UNIQUE INDEX company_members_email_uniq ON public.company_members (company_id, lower(work_email));
CREATE INDEX company_members_profile_idx ON public.company_members (profile_id);

GRANT SELECT ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_ride_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ride_request_id uuid NOT NULL UNIQUE REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  work_email text NOT NULL,
  cash_to_driver numeric NOT NULL DEFAULT 0,
  booking_fee numeric NOT NULL DEFAULT 0,
  segment_km numeric,
  origin_address text,
  destination_address text,
  period date NOT NULL DEFAULT date_trunc('month', now())::date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invoiced','cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX company_ride_charges_period_idx ON public.company_ride_charges (company_id, period);

GRANT SELECT ON public.company_ride_charges TO authenticated;
GRANT ALL ON public.company_ride_charges TO service_role;
ALTER TABLE public.company_ride_charges ENABLE ROW LEVEL SECURITY;

-- Pomocné funkcie -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND active = true
      AND profile_id = public.current_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_hr(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND active = true AND role = 'hr'
      AND profile_id = public.current_profile_id()
  );
$$;

-- RLS politiky --------------------------------------------------------------
CREATE POLICY "Members see own company" ON public.companies
  FOR SELECT TO authenticated USING (public.is_company_member(id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "See own membership row" ON public.company_members
  FOR SELECT TO authenticated USING (profile_id = public.current_profile_id());
CREATE POLICY "HR sees company members" ON public.company_members
  FOR SELECT TO authenticated USING (public.is_company_hr(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Own charges" ON public.company_ride_charges
  FOR SELECT TO authenticated USING (profile_id = public.current_profile_id());
CREATE POLICY "HR sees company charges" ON public.company_ride_charges
  FOR SELECT TO authenticated USING (public.is_company_hr(company_id) OR public.has_role(auth.uid(), 'admin'));

-- Prepojenie pracovného emailu na profil ------------------------------------
CREATE OR REPLACE FUNCTION public.link_my_company_memberships()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_email text;
  v_count integer := 0;
BEGIN
  IF v_profile IS NULL THEN RETURN 0; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RETURN 0; END IF;

  UPDATE public.company_members
    SET profile_id = v_profile, joined_at = COALESCE(joined_at, now())
    WHERE lower(work_email) = v_email AND active = true AND profile_id IS DISTINCT FROM v_profile;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Stav firemného benefitu pre prihláseného používateľa ----------------------
CREATE OR REPLACE FUNCTION public.my_company_benefit()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  m record;
  v_period date := date_trunc('month', now())::date;
  v_rides integer := 0;
  v_amount numeric := 0;
BEGIN
  IF v_profile IS NULL THEN RETURN jsonb_build_object('member', false); END IF;

  SELECT cm.id AS member_id, cm.role, cm.work_email, c.*
    INTO m
  FROM public.company_members cm
  JOIN public.companies c ON c.id = cm.company_id
  WHERE cm.profile_id = v_profile AND cm.active = true AND c.active = true
  ORDER BY cm.joined_at NULLS LAST
  LIMIT 1;

  IF m IS NULL THEN RETURN jsonb_build_object('member', false); END IF;

  SELECT count(*), COALESCE(sum(cash_to_driver + booking_fee), 0)
    INTO v_rides, v_amount
  FROM public.company_ride_charges
  WHERE company_id = m.id AND profile_id = v_profile AND period = v_period AND status <> 'cancelled';

  RETURN jsonb_build_object(
    'member', true,
    'company_id', m.id,
    'company_name', m.name,
    'role', m.role,
    'work_email', m.work_email,
    'monthly_ride_limit', m.monthly_ride_limit,
    'monthly_amount_limit', m.monthly_amount_limit,
    'per_ride_limit', m.per_ride_limit,
    'workdays_only', m.workdays_only,
    'used_rides', v_rides,
    'used_amount', v_amount,
    'remaining_rides', GREATEST(0, m.monthly_ride_limit - v_rides),
    'remaining_amount', GREATEST(0, m.monthly_amount_limit - v_amount)
  );
END;
$$;

-- Uplatnenie firemného benefitu na existujúcu žiadosť ------------------------
CREATE OR REPLACE FUNCTION public.claim_company_ride(_ride_request_id uuid, _cash_to_driver numeric, _booking_fee numeric, _segment_km numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_period date := date_trunc('month', now())::date;
  m record;
  rr record;
  v_rides integer;
  v_amount numeric;
  v_total numeric := COALESCE(_cash_to_driver,0) + COALESCE(_booking_fee,0);
BEGIN
  IF v_profile IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;

  SELECT cm.company_id, cm.work_email, c.monthly_ride_limit, c.monthly_amount_limit,
         c.per_ride_limit, c.workdays_only
    INTO m
  FROM public.company_members cm
  JOIN public.companies c ON c.id = cm.company_id
  WHERE cm.profile_id = v_profile AND cm.active = true AND c.active = true
  LIMIT 1;
  IF m IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_company_member'); END IF;

  SELECT rr2.id, rr2.ride_id, rr2.passenger_id, rr2.payment_status
    INTO rr
  FROM public.ride_requests rr2 WHERE rr2.id = _ride_request_id;
  IF rr IS NULL OR rr.passenger_id <> v_profile THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF rr.payment_status = 'company_paid' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;
  IF rr.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;

  IF m.workdays_only AND EXTRACT(ISODOW FROM now()) > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'workdays_only');
  END IF;
  IF v_total > m.per_ride_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'per_ride_limit', 'limit', m.per_ride_limit);
  END IF;

  SELECT count(*), COALESCE(sum(cash_to_driver + booking_fee), 0) INTO v_rides, v_amount
  FROM public.company_ride_charges
  WHERE company_id = m.company_id AND profile_id = v_profile AND period = v_period AND status <> 'cancelled';

  IF v_rides >= m.monthly_ride_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'monthly_ride_limit');
  END IF;
  IF v_amount + v_total > m.monthly_amount_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'monthly_amount_limit');
  END IF;

  INSERT INTO public.company_ride_charges (
    company_id, profile_id, ride_request_id, ride_id, work_email,
    cash_to_driver, booking_fee, segment_km, origin_address, destination_address, period
  )
  SELECT m.company_id, v_profile, rr.id, rr.ride_id, m.work_email,
         COALESCE(_cash_to_driver,0), COALESCE(_booking_fee,0), _segment_km,
         r.origin_address, r.destination_address, v_period
  FROM public.rides r WHERE r.id = rr.ride_id
  ON CONFLICT (ride_request_id) DO NOTHING;

  UPDATE public.ride_requests
    SET payment_status = 'company_paid',
        amount_paid = COALESCE(_booking_fee, 0),
        paid_at = now()
    WHERE id = rr.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- HR: registrácia pracovných emailov ---------------------------------------
CREATE OR REPLACE FUNCTION public.hr_register_emails(_company_id uuid, _emails text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_domain text;
  e text;
  v_added integer := 0;
  v_skipped text[] := '{}';
BEGIN
  IF NOT (public.is_company_hr(_company_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT lower(email_domain) INTO v_domain FROM public.companies WHERE id = _company_id;

  FOREACH e IN ARRAY _emails LOOP
    e := lower(trim(e));
    CONTINUE WHEN e = '';
    IF e !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' OR split_part(e, '@', 2) <> v_domain THEN
      v_skipped := v_skipped || e;
      CONTINUE;
    END IF;
    INSERT INTO public.company_members (company_id, work_email)
    VALUES (_company_id, e)
    ON CONFLICT (company_id, lower(work_email)) DO NOTHING;
    IF FOUND THEN v_added := v_added + 1; END IF;
  END LOOP;

  PERFORM public.link_existing_profiles_for_company(_company_id);
  RETURN jsonb_build_object('success', true, 'added', v_added, 'skipped', v_skipped);
END;
$$;

CREATE OR REPLACE FUNCTION public.link_existing_profiles_for_company(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  UPDATE public.company_members cm
    SET profile_id = p.id, joined_at = COALESCE(cm.joined_at, now())
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE cm.company_id = _company_id
    AND cm.profile_id IS NULL
    AND u.email_confirmed_at IS NOT NULL
    AND lower(u.email) = lower(cm.work_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_set_member_active(_member_id uuid, _active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.company_members WHERE id = _member_id;
  IF v_company IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF NOT (public.is_company_hr(v_company) OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  UPDATE public.company_members SET active = _active WHERE id = _member_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- HR prehľad + mesačný podklad k faktúre ------------------------------------
CREATE OR REPLACE FUNCTION public.hr_company_overview(_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period date := date_trunc('month', now())::date;
  v jsonb;
BEGIN
  IF NOT (public.is_company_hr(_company_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'company', (SELECT to_jsonb(c) FROM public.companies c WHERE c.id = _company_id),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cm.id, 'work_email', cm.work_email, 'role', cm.role, 'active', cm.active,
        'joined', cm.profile_id IS NOT NULL, 'full_name', p.full_name,
        'rides_this_month', (SELECT count(*) FROM public.company_ride_charges ch
            WHERE ch.company_id = _company_id AND ch.profile_id = cm.profile_id
              AND ch.period = v_period AND ch.status <> 'cancelled'),
        'amount_this_month', COALESCE((SELECT sum(ch.cash_to_driver + ch.booking_fee) FROM public.company_ride_charges ch
            WHERE ch.company_id = _company_id AND ch.profile_id = cm.profile_id
              AND ch.period = v_period AND ch.status <> 'cancelled'), 0)
      ) ORDER BY cm.work_email)
      FROM public.company_members cm
      LEFT JOIN public.profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = _company_id
    ), '[]'::jsonb),
    'month_rides', (SELECT count(*) FROM public.company_ride_charges
        WHERE company_id = _company_id AND period = v_period AND status <> 'cancelled'),
    'month_amount', COALESCE((SELECT sum(cash_to_driver + booking_fee) FROM public.company_ride_charges
        WHERE company_id = _company_id AND period = v_period AND status <> 'cancelled'), 0)
  ) INTO v;

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_monthly_invoice(_company_id uuid, _month date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period date := date_trunc('month', _month)::date;
  v jsonb;
BEGIN
  IF NOT (public.is_company_hr(_company_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'period', v_period,
    'company', (SELECT to_jsonb(c) FROM public.companies c WHERE c.id = _company_id),
    'rides', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'created_at', ch.created_at, 'work_email', ch.work_email, 'full_name', p.full_name,
        'origin', ch.origin_address, 'destination', ch.destination_address,
        'segment_km', ch.segment_km, 'cash_to_driver', ch.cash_to_driver,
        'booking_fee', ch.booking_fee, 'status', ch.status,
        'request_status', rr.status
      ) ORDER BY ch.created_at)
      FROM public.company_ride_charges ch
      LEFT JOIN public.profiles p ON p.id = ch.profile_id
      LEFT JOIN public.ride_requests rr ON rr.id = ch.ride_request_id
      WHERE ch.company_id = _company_id AND ch.period = v_period AND ch.status <> 'cancelled'
    ), '[]'::jsonb),
    'total_cash', COALESCE((SELECT sum(cash_to_driver) FROM public.company_ride_charges
        WHERE company_id = _company_id AND period = v_period AND status <> 'cancelled'), 0),
    'total_fee', COALESCE((SELECT sum(booking_fee) FROM public.company_ride_charges
        WHERE company_id = _company_id AND period = v_period AND status <> 'cancelled'), 0)
  ) INTO v;

  RETURN v;
END;
$$;

-- Admin: správa firiem ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_company(
  _name text, _email_domain text, _billing_email text,
  _ico text DEFAULT NULL, _address text DEFAULT NULL,
  _monthly_ride_limit integer DEFAULT 40, _monthly_amount_limit numeric DEFAULT 200,
  _per_ride_limit numeric DEFAULT 10, _workdays_only boolean DEFAULT true,
  _company_id uuid DEFAULT NULL, _active boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _company_id IS NULL THEN
    INSERT INTO public.companies (name, email_domain, billing_email, ico, address,
      monthly_ride_limit, monthly_amount_limit, per_ride_limit, workdays_only, active)
    VALUES (_name, lower(_email_domain), _billing_email, _ico, _address,
      _monthly_ride_limit, _monthly_amount_limit, _per_ride_limit, _workdays_only, _active)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.companies SET name = _name, email_domain = lower(_email_domain),
      billing_email = _billing_email, ico = _ico, address = _address,
      monthly_ride_limit = _monthly_ride_limit, monthly_amount_limit = _monthly_amount_limit,
      per_ride_limit = _per_ride_limit, workdays_only = _workdays_only, active = _active,
      updated_at = now()
    WHERE id = _company_id RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_company_hr(_company_id uuid, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := lower(trim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.company_members (company_id, work_email, role)
  VALUES (_company_id, v_email, 'hr')
  ON CONFLICT (company_id, lower(work_email)) DO UPDATE SET role = 'hr', active = true;
  PERFORM public.link_existing_profiles_for_company(_company_id);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_companies()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'email_domain', c.email_domain, 'billing_email', c.billing_email,
    'active', c.active, 'monthly_ride_limit', c.monthly_ride_limit,
    'monthly_amount_limit', c.monthly_amount_limit, 'per_ride_limit', c.per_ride_limit,
    'workdays_only', c.workdays_only,
    'members', (SELECT count(*) FROM public.company_members cm WHERE cm.company_id = c.id AND cm.active),
    'month_rides', (SELECT count(*) FROM public.company_ride_charges ch
        WHERE ch.company_id = c.id AND ch.period = date_trunc('month', now())::date AND ch.status <> 'cancelled'),
    'month_amount', COALESCE((SELECT sum(ch.cash_to_driver + ch.booking_fee) FROM public.company_ride_charges ch
        WHERE ch.company_id = c.id AND ch.period = date_trunc('month', now())::date AND ch.status <> 'cancelled'), 0)
  ) ORDER BY c.name), '[]'::jsonb) INTO v FROM public.companies c;
  RETURN v;
END;
$$;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
