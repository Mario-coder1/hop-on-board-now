CREATE OR REPLACE FUNCTION public.block_request_on_departed_ride()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT status, departure_time INTO r FROM public.rides WHERE id = NEW.ride_id;
  IF r.status = 'active' AND r.departure_time < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'Táto jazda už skončila';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_block_request_on_departed_ride
BEFORE INSERT ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.block_request_on_departed_ride();