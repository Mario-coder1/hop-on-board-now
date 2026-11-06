CREATE TABLE public.booking_credits (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  free_credits integer NOT NULL DEFAULT 1 CHECK (free_credits >= 0),
  referral_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text),1,8)),
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_rewarded_at timestamptz,
  invited_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_credits TO authenticated;
GRANT ALL ON public.booking_credits TO service_role;
ALTER TABLE public.booking_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits" ON public.booking_credits FOR SELECT TO authenticated USING (profile_id = public.current_profile_id() OR public.has_role(auth.uid(),'admin'));

INSERT INTO public.booking_credits(profile_id, free_credits)
SELECT p.id, CASE WHEN EXISTS(SELECT 1 FROM public.ride_requests r WHERE r.passenger_id=p.id AND r.payment_status IN ('paid','partially_refunded')) THEN 0 ELSE 1 END
FROM public.profiles p ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_booking_credits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.booking_credits(profile_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER create_booking_credits AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_booking_credits();

CREATE OR REPLACE FUNCTION public.my_booking_credits() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); c record; BEGIN
IF p IS NULL THEN RETURN jsonb_build_object('free_credits',0); END IF;
INSERT INTO public.booking_credits(profile_id) VALUES (p) ON CONFLICT DO NOTHING;
SELECT * INTO c FROM public.booking_credits WHERE profile_id=p;
RETURN jsonb_build_object('free_credits',c.free_credits,'referral_code',c.referral_code,'invited_count',c.invited_count,'referred', c.referred_by IS NOT NULL);
END $$;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); inviter uuid; me record; BEGIN
IF p IS NULL THEN RETURN jsonb_build_object('success',false); END IF;
INSERT INTO public.booking_credits(profile_id) VALUES (p) ON CONFLICT DO NOTHING;
SELECT * INTO me FROM public.booking_credits WHERE profile_id=p FOR UPDATE;
IF me.referred_by IS NOT NULL OR me.created_at < now()-interval '7 days' THEN RETURN jsonb_build_object('success',false,'error','already'); END IF;
SELECT profile_id INTO inviter FROM public.booking_credits WHERE referral_code=upper(trim(_code));
IF inviter IS NULL OR inviter=p THEN RETURN jsonb_build_object('success',false,'error','invalid'); END IF;
UPDATE public.booking_credits SET referred_by=inviter WHERE profile_id=p;
UPDATE public.booking_credits SET invited_count=invited_count+1 WHERE profile_id=inviter;
RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.book_free_ride(_ride_id uuid,_pickup_address text,_pickup_lat numeric,_pickup_lng numeric,_dropoff_address text,_dropoff_lat numeric,_dropoff_lng numeric,_message text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); c record; r record; rid uuid; BEGIN
IF p IS NULL THEN RAISE EXCEPTION 'Prihláste sa'; END IF;
IF EXISTS(SELECT 1 FROM public.company_modes WHERE profile_id=p AND company_id IS NOT NULL) THEN RAISE EXCEPTION 'Použite firemnú rezerváciu alebo sa odpojte od firmy'; END IF;
SELECT * INTO c FROM public.booking_credits WHERE profile_id=p FOR UPDATE;
IF c IS NULL OR c.free_credits<=0 THEN RAISE EXCEPTION 'Nemáte bezplatnú rezerváciu'; END IF;
SELECT * INTO r FROM public.rides WHERE id=_ride_id FOR UPDATE;
IF r IS NULL OR r.driver_id=p OR r.available_seats<=0 OR r.status NOT IN ('active','in_progress') OR (r.status='active' AND r.departure_time<now()-interval '15 minutes') THEN RAISE EXCEPTION 'Jazda nie je dostupná'; END IF;
IF r.university_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.university_memberships WHERE profile_id=p AND university_id=r.university_id) THEN RAISE EXCEPTION 'Jazda nie je dostupná'; END IF;
IF nullif(trim(_pickup_address),'') IS NULL OR _pickup_lat IS NULL OR _pickup_lng IS NULL THEN RAISE EXCEPTION 'Vyberte miesto nastúpenia'; END IF;
IF EXISTS(SELECT 1 FROM public.ride_requests WHERE ride_id=r.id AND passenger_id=p AND status NOT IN ('cancelled','rejected')) THEN RAISE EXCEPTION 'Jazdu už máte rezervovanú'; END IF;
PERFORM set_config('app.free_booking','yes',true);
INSERT INTO public.ride_requests(ride_id,passenger_id,pickup_address,pickup_lat,pickup_lng,dropoff_address,dropoff_lat,dropoff_lng,message,status,payment_status,price_per_seat_snapshot,amount_paid,paid_at)
VALUES(r.id,p,_pickup_address,_pickup_lat,_pickup_lng,nullif(_dropoff_address,''),_dropoff_lat,_dropoff_lng,_message,'pending','free',r.price_per_seat,0,now()) RETURNING id INTO rid;
UPDATE public.booking_credits SET free_credits=free_credits-1 WHERE profile_id=p;
RETURN rid; END $$;

CREATE OR REPLACE FUNCTION public.guard_free_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inviter uuid; BEGIN
IF TG_OP='INSERT' THEN
  IF NEW.payment_status IN ('free','free_returned') AND coalesce(current_setting('app.free_booking',true),'')<>'yes' AND coalesce(auth.role(),'')<>'service_role' AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Neplatná rezervácia'; END IF;
  RETURN NEW;
END IF;
IF OLD.payment_status='free' AND NEW.payment_status IS DISTINCT FROM OLD.payment_status AND coalesce(current_setting('app.free_booking',true),'')<>'yes' AND coalesce(auth.role(),'')<>'service_role' AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Neplatná zmena'; END IF;
-- Vodič odmietol/zrušil alebo nevyzdvihol pred nástupom → bezplatná rezervácia sa vracia
IF OLD.payment_status='free' AND NEW.status IN ('rejected','cancelled') AND OLD.status NOT IN ('rejected','cancelled') AND NEW.pin_verified_at IS NULL THEN
  UPDATE public.booking_credits SET free_credits=free_credits+1 WHERE profile_id=NEW.passenger_id;
  NEW.payment_status:='free_returned';
END IF;
-- Odmena za pozvanie: prvý nástup pozvaného → pozývateľ dostane 1 bezplatnú rezerváciu
IF NEW.pin_verified_at IS NOT NULL AND OLD.pin_verified_at IS NULL THEN
  UPDATE public.booking_credits SET referral_rewarded_at=now() WHERE profile_id=NEW.passenger_id AND referred_by IS NOT NULL AND referral_rewarded_at IS NULL RETURNING referred_by INTO inviter;
  IF inviter IS NOT NULL THEN
    UPDATE public.booking_credits SET free_credits=free_credits+1 WHERE profile_id=inviter;
    INSERT INTO public.notifications(profile_id,title,message) VALUES (inviter,'🎁 Odmena za pozvanie','Tvoj kamarát absolvoval prvú jazdu. Ďalšia rezervácia je pre teba zdarma.');
  END IF;
END IF;
RETURN NEW; END $$;
CREATE TRIGGER guard_free_booking BEFORE INSERT OR UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_free_booking();

CREATE TABLE public.ride_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_text text NOT NULL CHECK (length(origin_text) BETWEEN 2 AND 120),
  destination_text text NOT NULL CHECK (length(destination_text) BETWEEN 2 AND 120),
  travel_date date NOT NULL,
  seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 8),
  note text CHECK (note IS NULL OR length(note) <= 300),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_wishes TO authenticated;
GRANT ALL ON public.ride_wishes TO service_role;
ALTER TABLE public.ride_wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view active wishes" ON public.ride_wishes FOR SELECT TO authenticated USING ((active AND travel_date >= current_date) OR passenger_id=public.current_profile_id());
CREATE POLICY "insert own wish" ON public.ride_wishes FOR INSERT TO authenticated WITH CHECK (passenger_id=public.current_profile_id() AND travel_date >= current_date);
CREATE POLICY "update own wish" ON public.ride_wishes FOR UPDATE TO authenticated USING (passenger_id=public.current_profile_id()) WITH CHECK (passenger_id=public.current_profile_id());
CREATE POLICY "delete own wish" ON public.ride_wishes FOR DELETE TO authenticated USING (passenger_id=public.current_profile_id());

CREATE OR REPLACE FUNCTION public.notify_drivers_ride_wish() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d uuid; body text; BEGIN
IF (SELECT count(*) FROM public.ride_wishes WHERE passenger_id=NEW.passenger_id AND created_at>now()-interval '1 day')>5 THEN RETURN NEW; END IF;
body := NEW.origin_text||' → '||NEW.destination_text||', '||to_char(NEW.travel_date,'DD.MM.YYYY');
FOR d IN SELECT DISTINCT driver_id FROM (
  SELECT driver_id FROM public.rides WHERE created_at>now()-interval '90 days' AND (lower(origin_address) LIKE '%'||lower(NEW.origin_text)||'%' OR lower(destination_address) LIKE '%'||lower(NEW.destination_text)||'%')
  UNION SELECT driver_id FROM public.ride_templates WHERE active AND (lower(origin_address) LIKE '%'||lower(NEW.origin_text)||'%' OR lower(destination_address) LIKE '%'||lower(NEW.destination_text)||'%')
) s WHERE driver_id<>NEW.passenger_id LIMIT 50 LOOP
  INSERT INTO public.notifications(profile_id,title,message) VALUES (d,'🙋 Niekto hľadá odvoz',body);
  BEGIN PERFORM public.send_push_via_edge(d,'🙋 Niekto hľadá odvoz',body,jsonb_build_object('url','/hladam-odvoz')); EXCEPTION WHEN others THEN NULL; END;
END LOOP;
RETURN NEW; END $$;
CREATE TRIGGER notify_drivers_ride_wish AFTER INSERT ON public.ride_wishes FOR EACH ROW EXECUTE FUNCTION public.notify_drivers_ride_wish();

REVOKE EXECUTE ON FUNCTION public.book_free_ride(uuid,text,numeric,numeric,text,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_free_ride(uuid,text,numeric,numeric,text,numeric,numeric,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_booking_credits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_booking_credits() TO authenticated;