CREATE OR REPLACE FUNCTION public.block_request_on_departed_ride()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
 SELECT status, departure_time INTO r FROM public.rides WHERE id = NEW.ride_id;
 IF NOT FOUND OR r.status IS NULL OR r.status NOT IN ('active', 'in_progress') THEN
  RAISE EXCEPTION 'Jazda nie je dostupná';
 END IF;
 IF (r.status = 'active' AND r.departure_time < now() - interval '3 hours')
    OR (r.status = 'in_progress' AND r.departure_time < now() - interval '12 hours') THEN
  RAISE EXCEPTION 'Táto jazda už skončila';
 END IF;
 RETURN NEW;
END $$;