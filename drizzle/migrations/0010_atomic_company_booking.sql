CREATE OR REPLACE FUNCTION public.company_distance_km(a_lat numeric,a_lng numeric,b_lat numeric,b_lng numeric) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT (6371*2*asin(least(1.0,sqrt(power(sin(radians((b_lat-a_lat)::double precision/2)),2)+cos(radians(a_lat::double precision))*cos(radians(b_lat::double precision))*power(sin(radians((b_lng-a_lng)::double precision/2)),2)))))::numeric $$;
CREATE OR REPLACE FUNCTION public.book_company_ride(_ride_id uuid,_pickup_address text,_pickup_lat numeric,_pickup_lng numeric,_dropoff_address text,_dropoff_lat numeric,_dropoff_lng numeric,_message text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); c record; r record; rid uuid; n int; used numeric; total numeric; segment numeric; cash numeric; fee numeric; route jsonb; pt jsonb; prev jsonb; dist numeric:=0; d1 numeric:=1e10; d2 numeric:=1e10; at1 numeric:=0; at2 numeric:=0; d numeric; BEGIN
SELECT co.* INTO c FROM public.company_modes s JOIN public.companies co ON co.id=s.company_id JOIN public.company_members m ON m.company_id=co.id AND m.profile_id=s.profile_id WHERE s.profile_id=p AND co.active AND m.active FOR UPDATE OF s;
IF c IS NULL THEN RAISE EXCEPTION 'Najprv sa pripojte k firme'; END IF;
SELECT * INTO r FROM public.rides WHERE id=_ride_id FOR UPDATE;
IF r IS NULL OR r.driver_id=p OR r.available_seats<=0 OR r.status NOT IN ('active','in_progress') OR (r.status='active' AND r.departure_time<now()-interval '15 minutes') THEN RAISE EXCEPTION 'Jazda nie je dostupná'; END IF;
IF nullif(trim(_pickup_address),'') IS NULL OR nullif(trim(_dropoff_address),'') IS NULL OR _pickup_lat IS NULL OR _pickup_lng IS NULL OR _dropoff_lat IS NULL OR _dropoff_lng IS NULL OR abs(_pickup_lat)>90 OR abs(_dropoff_lat)>90 OR abs(_pickup_lng)>180 OR abs(_dropoff_lng)>180 THEN RAISE EXCEPTION 'Vyberte miesto nastúpenia aj vystúpenia'; END IF;
IF EXISTS(SELECT 1 FROM public.ride_requests WHERE ride_id=r.id AND passenger_id=p AND status NOT IN ('cancelled','rejected')) THEN RAISE EXCEPTION 'Jazdu už máte rezervovanú'; END IF;
total:=public.company_distance_km(r.origin_lat,r.origin_lng,r.destination_lat,r.destination_lng); segment:=public.company_distance_km(_pickup_lat,_pickup_lng,_dropoff_lat,_dropoff_lng);
BEGIN route:=r.route_polyline::jsonb; EXCEPTION WHEN others THEN route:=NULL; END;
IF jsonb_typeof(route)='array' AND jsonb_array_length(route)>1 THEN
FOR pt IN SELECT value FROM jsonb_array_elements(route) LOOP
IF prev IS NOT NULL THEN dist:=dist+public.company_distance_km((prev->>1)::numeric,(prev->>0)::numeric,(pt->>1)::numeric,(pt->>0)::numeric); END IF;
d:=public.company_distance_km(_pickup_lat,_pickup_lng,(pt->>1)::numeric,(pt->>0)::numeric); IF d<d1 THEN d1:=d; at1:=dist; END IF;
d:=public.company_distance_km(_dropoff_lat,_dropoff_lng,(pt->>1)::numeric,(pt->>0)::numeric); IF d<d2 THEN d2:=d; at2:=dist; END IF; prev:=pt; END LOOP;
total:=dist; segment:=abs(at2-at1);
END IF;
cash:=round(r.price_per_seat*CASE WHEN total>0 THEN least(1,segment/total) ELSE 1 END,2); fee:=greatest(1,round(cash*0.15,2));
IF cash<0 THEN RAISE EXCEPTION 'Neplatná cena jazdy'; END IF;
IF c.workdays_only AND extract(isodow FROM r.departure_time AT TIME ZONE 'Europe/Bratislava')>5 THEN RAISE EXCEPTION 'Benefit platí iba v pracovné dni'; END IF;
SELECT count(*),coalesce(sum(cash_to_driver+booking_fee),0) INTO n,used FROM public.company_ride_charges WHERE company_id=c.id AND profile_id=p AND period=date_trunc('month',now())::date AND status<>'cancelled';
IF n>=c.monthly_ride_limit OR used+cash+fee>c.monthly_amount_limit OR cash+fee>c.per_ride_limit THEN RAISE EXCEPTION 'Prekročený firemný limit. Pre bežnú jazdu sa odpojte od firmy.'; END IF;
PERFORM set_config('app.company_booking','yes',true);
INSERT INTO public.ride_requests(ride_id,passenger_id,pickup_address,pickup_lat,pickup_lng,dropoff_address,dropoff_lat,dropoff_lng,message,status,payment_status,company_id,price_per_seat_snapshot,amount_paid,paid_at) VALUES(r.id,p,_pickup_address,_pickup_lat,_pickup_lng,_dropoff_address,_dropoff_lat,_dropoff_lng,_message,'pending','company_paid',c.id,r.price_per_seat,fee,now()) RETURNING id INTO rid;
INSERT INTO public.company_ride_charges(company_id,profile_id,ride_request_id,ride_id,work_email,cash_to_driver,booking_fee,segment_km,origin_address,destination_address,period) SELECT c.id,p,rid,r.id,m.work_email,cash,fee,segment,_pickup_address,_dropoff_address,date_trunc('month',now())::date FROM public.company_members m WHERE m.company_id=c.id AND m.profile_id=p LIMIT 1;
RETURN rid; END $$;
CREATE OR REPLACE FUNCTION public.guard_company_booking() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF current_setting('app.company_booking',true)='yes' OR coalesce(auth.role(),'')='service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN
IF NEW.company_id IS NOT NULL OR NEW.payment_status='company_paid' OR EXISTS(SELECT 1 FROM public.company_modes WHERE profile_id=NEW.passenger_id AND company_id IS NOT NULL) THEN RAISE EXCEPTION 'Použite firemnú rezerváciu alebo sa odpojte od firmy'; END IF;
ELSE
IF NEW.company_id IS DISTINCT FROM OLD.company_id OR (NEW.payment_status='company_paid' AND OLD.payment_status<>'company_paid') THEN RAISE EXCEPTION 'Firemnú platbu nemožno meniť'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_company_booking BEFORE INSERT OR UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_company_booking();
CREATE OR REPLACE FUNCTION public.claim_company_ride(_ride_request_id uuid,_cash_to_driver numeric,_booking_fee numeric,_segment_km numeric DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN jsonb_build_object('success',false,'error','use_atomic_company_booking'); END $$;
REVOKE EXECUTE ON FUNCTION public.book_company_ride(uuid,text,numeric,numeric,text,numeric,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.book_company_ride(uuid,text,numeric,numeric,text,numeric,numeric,text) TO authenticated;
UPDATE public.ride_requests rr SET company_id=ch.company_id FROM public.company_ride_charges ch WHERE ch.ride_request_id=rr.id AND rr.company_id IS NULL;