CREATE OR REPLACE FUNCTION public.book_free_ride(_ride_id uuid,_pickup_address text,_pickup_lat numeric,_pickup_lng numeric,_dropoff_address text,_dropoff_lat numeric,_dropoff_lng numeric,_message text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_profile_id(); c record; r record; rid uuid; BEGIN
IF p IS NULL THEN RAISE EXCEPTION 'Prihláste sa'; END IF;
IF EXISTS(SELECT 1 FROM public.company_modes WHERE profile_id=p AND company_id IS NOT NULL) THEN RAISE EXCEPTION 'Použite firemnú rezerváciu alebo sa odpojte od firmy'; END IF;
SELECT * INTO c FROM public.booking_credits WHERE profile_id=p FOR UPDATE;
IF c IS NULL OR c.free_credits<=0 THEN RAISE EXCEPTION 'Nemáte bezplatnú rezerváciu'; END IF;
SELECT * INTO r FROM public.rides WHERE id=_ride_id FOR UPDATE;
IF r IS NULL OR r.driver_id=p OR r.available_seats<=0 OR r.status NOT IN ('active','in_progress') OR NOT public.is_ride_joinable(r.id) THEN RAISE EXCEPTION 'Jazda nie je dostupná'; END IF;
IF r.university_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.university_memberships WHERE profile_id=p AND university_id=r.university_id) THEN RAISE EXCEPTION 'Jazda nie je dostupná'; END IF;
IF nullif(trim(_pickup_address),'') IS NULL OR _pickup_lat IS NULL OR _pickup_lng IS NULL THEN RAISE EXCEPTION 'Vyberte miesto nastúpenia'; END IF;
IF EXISTS(SELECT 1 FROM public.ride_requests WHERE ride_id=r.id AND passenger_id=p AND status NOT IN ('cancelled','rejected')) THEN RAISE EXCEPTION 'Jazdu už máte rezervovanú'; END IF;
PERFORM set_config('app.free_booking','yes',true);
INSERT INTO public.ride_requests(ride_id,passenger_id,pickup_address,pickup_lat,pickup_lng,dropoff_address,dropoff_lat,dropoff_lng,message,status,payment_status,price_per_seat_snapshot,amount_paid,paid_at)
VALUES(r.id,p,_pickup_address,_pickup_lat,_pickup_lng,nullif(_dropoff_address,''),_dropoff_lat,_dropoff_lng,_message,'pending','free',r.price_per_seat,0,now()) RETURNING id INTO rid;
UPDATE public.booking_credits SET free_credits=free_credits-1 WHERE profile_id=p;
RETURN rid; END $$;