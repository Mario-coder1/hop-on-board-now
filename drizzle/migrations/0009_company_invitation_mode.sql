ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invite_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS companies_invite_token_idx ON public.companies(invite_token);
CREATE TABLE public.company_modes (profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.company_modes TO authenticated;
GRANT ALL ON public.company_modes TO service_role;
ALTER TABLE public.company_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_company_mode ON public.company_modes FOR SELECT TO authenticated USING(profile_id = public.current_profile_id());
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS ride_requests_company_idx ON public.ride_requests(company_id);
DROP POLICY IF EXISTS "HR sees company members" ON public.company_members;
CREATE POLICY admin_company_members ON public.company_members FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "HR sees company charges" ON public.company_ride_charges;
CREATE POLICY admin_company_charges ON public.company_ride_charges FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.company_portal_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid := public.current_profile_id(); v jsonb; BEGIN
SELECT jsonb_build_object('active_company_id',(SELECT company_id FROM public.company_modes WHERE profile_id=p),'memberships',coalesce(jsonb_agg(jsonb_build_object('company_id',c.id,'company_name',c.name,'role',m.role) ORDER BY c.name),'[]'::jsonb)) INTO v FROM public.company_members m JOIN public.companies c ON c.id=m.company_id WHERE m.profile_id=p AND m.active AND c.active; RETURN v; END $$;
CREATE OR REPLACE FUNCTION public.register_company(_name text,_billing_email text,_ico text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); e text; cid uuid; BEGIN
SELECT email INTO e FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
IF p IS NULL OR e IS NULL THEN RAISE EXCEPTION 'Najprv potvrďte svoj email'; END IF;
IF length(trim(_name))<2 OR _billing_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Vyplňte názov firmy a platný fakturačný email'; END IF;
IF (SELECT count(*) FROM public.company_members WHERE profile_id=p AND role='hr')>=5 THEN RAISE EXCEPTION 'Limit registrácií firiem'; END IF;
INSERT INTO public.companies(name,email_domain,billing_email,ico) VALUES(trim(_name),'',trim(_billing_email),nullif(trim(_ico),'')) RETURNING id INTO cid;
INSERT INTO public.company_members(company_id,profile_id,work_email,role,joined_at) VALUES(cid,p,e,'hr',now()); RETURN cid; END $$;
CREATE OR REPLACE FUNCTION public.join_company(_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); e text; cid uuid; BEGIN
SELECT email INTO e FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
IF p IS NULL OR e IS NULL THEN RAISE EXCEPTION 'Najprv potvrďte svoj email'; END IF;
SELECT id INTO cid FROM public.companies WHERE invite_token=_token AND active;
IF cid IS NULL THEN RAISE EXCEPTION 'Pozvánka nie je platná'; END IF;
INSERT INTO public.company_members(company_id,profile_id,work_email,joined_at) VALUES(cid,p,e,now()) ON CONFLICT(company_id,lower(work_email)) DO UPDATE SET profile_id=excluded.profile_id,active=true,joined_at=coalesce(company_members.joined_at,now());
INSERT INTO public.company_modes(profile_id,company_id) VALUES(p,cid) ON CONFLICT(profile_id) DO UPDATE SET company_id=cid,updated_at=now(); RETURN cid; END $$;
CREATE OR REPLACE FUNCTION public.set_company_mode(_company_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); BEGIN
IF p IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
IF _company_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.company_members m JOIN public.companies c ON c.id=m.company_id WHERE m.profile_id=p AND m.company_id=_company_id AND m.active AND c.active) THEN RAISE EXCEPTION 'forbidden'; END IF;
INSERT INTO public.company_modes(profile_id,company_id) VALUES(p,_company_id) ON CONFLICT(profile_id) DO UPDATE SET company_id=excluded.company_id,updated_at=now(); END $$;
CREATE OR REPLACE FUNCTION public.my_company_benefit() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); m record; n integer; a numeric; BEGIN
SELECT c.*,cm.role,cm.work_email INTO m FROM public.company_modes s JOIN public.company_members cm ON cm.company_id=s.company_id AND cm.profile_id=s.profile_id JOIN public.companies c ON c.id=s.company_id WHERE s.profile_id=p AND cm.active AND c.active;
IF m IS NULL THEN RETURN jsonb_build_object('member',false); END IF;
SELECT count(*),coalesce(sum(cash_to_driver+booking_fee),0) INTO n,a FROM public.company_ride_charges WHERE company_id=m.id AND profile_id=p AND period=date_trunc('month',now())::date AND status<>'cancelled';
RETURN jsonb_build_object('member',true,'company_id',m.id,'company_name',m.name,'role',m.role,'per_ride_limit',m.per_ride_limit,'workdays_only',m.workdays_only,'remaining_rides',greatest(0,m.monthly_ride_limit-n),'remaining_amount',greatest(0,m.monthly_amount_limit-a)); END $$;
CREATE OR REPLACE FUNCTION public.hr_company_overview(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v jsonb; BEGIN
IF NOT(public.is_company_hr(_company_id) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
SELECT jsonb_build_object('company',(SELECT jsonb_build_object('id',id,'name',name,'billing_email',billing_email,'invite_token',invite_token) FROM public.companies WHERE id=_company_id),'month_rides',count(*),'month_amount',coalesce(sum(cash_to_driver+booking_fee),0),'co2_kg',coalesce(sum(segment_km) FILTER(WHERE status='completed'),0)*0.15015) INTO v FROM public.company_ride_charges WHERE company_id=_company_id AND period=date_trunc('month',now())::date AND status<>'cancelled'; RETURN v; END $$;
CREATE OR REPLACE FUNCTION public.hr_monthly_invoice(_company_id uuid,_month date) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT(public.is_company_hr(_company_id) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
RETURN (SELECT jsonb_build_object('period',date_trunc('month',_month)::date,'ride_count',count(*),'total_cash',coalesce(sum(cash_to_driver),0),'total_fee',coalesce(sum(booking_fee),0),'co2_kg',coalesce(sum(segment_km) FILTER(WHERE status='completed'),0)*0.15015) FROM public.company_ride_charges WHERE company_id=_company_id AND period=date_trunc('month',_month)::date AND status<>'cancelled'); END $$;
REVOKE EXECUTE ON FUNCTION public.hr_register_emails(uuid,text[]) FROM authenticated,anon,PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hr_set_member_active(uuid,boolean) FROM authenticated,anon,PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_company(text,text,text),public.join_company(text),public.set_company_mode(uuid),public.company_portal_state() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_company(text,text,text),public.join_company(text),public.set_company_mode(uuid),public.company_portal_state() TO authenticated;
CREATE OR REPLACE FUNCTION public.company_charge_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.status IN ('cancelled','rejected') THEN UPDATE public.company_ride_charges SET status='cancelled' WHERE ride_request_id=NEW.id;
ELSIF NEW.status='completed' THEN UPDATE public.company_ride_charges SET status='completed' WHERE ride_request_id=NEW.id; END IF; RETURN NEW; END $$;
CREATE TRIGGER company_charge_status_update AFTER UPDATE OF status ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.company_charge_status();