CREATE OR REPLACE FUNCTION public.block_request_on_departed_ride()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
 SELECT status INTO r FROM public.rides WHERE id = NEW.ride_id;
 IF NOT FOUND OR r.status IS NULL OR r.status NOT IN ('active', 'in_progress') THEN
  RAISE EXCEPTION 'Jazda nie je dostupná';
 END IF;
 RETURN NEW;
END $function$;
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO STRICT definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='book_company_ride';
 IF position(' OR (r.status=''active'' AND r.departure_time<now()-interval ''15 minutes'')' IN definition)=0 THEN
  RAISE EXCEPTION 'Expected company booking departure guard not found';
 END IF;
 definition := replace(definition, ' OR (r.status=''active'' AND r.departure_time<now()-interval ''15 minutes'')', '');
 EXECUTE definition;
END $migration$;