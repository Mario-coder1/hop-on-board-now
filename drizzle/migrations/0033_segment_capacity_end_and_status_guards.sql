CREATE OR REPLACE FUNCTION public.guard_seat_status_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(auth.role(),'')='service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF NEW.status IN ('accepted','driver_arrived','picked_up','completed') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) AND NOT public.is_ride_driver(NEW.ride_id) THEN
 IF TG_OP='UPDATE' AND NEW.status='picked_up' AND NEW.pin_verified_at IS NOT NULL AND NEW.driver_confirmed_at IS NOT NULL AND NEW.passenger_confirmed_at IS NOT NULL THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Obsadenie a vystúpenie potvrdzuje vodič'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_seat_status_owner BEFORE INSERT OR UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_seat_status_owner();
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='refresh_ride_seats';
 d:=replace(d,'old_setting text;','old_setting text; route_end double precision;');
 d:=replace(d,'full_free:=public.segment_free_seats', 'SELECT s.end_m INTO route_end FROM public.rides r CROSS JOIN LATERAL public.seat_segment(r.route_polyline,r.origin_lat,r.origin_lng,r.destination_lat,r.destination_lng) s WHERE r.id=rid; full_free:=public.segment_free_seats');
 d:=replace(d,'WHERE b<1e15','WHERE b<coalesce(route_end,1e15)-1');
 EXECUTE d;
END $$;