ALTER TABLE public.rides ADD COLUMN total_seats integer, ADD COLUMN full_route_seats integer;
ALTER TABLE public.ride_requests ADD COLUMN segment_start_m double precision, ADD COLUMN segment_end_m double precision;
UPDATE public.rides r SET total_seats = r.available_seats + (SELECT count(*)::integer FROM public.ride_requests q WHERE q.ride_id=r.id AND q.status IN ('accepted','driver_arrived','picked_up')), full_route_seats=r.available_seats;

CREATE OR REPLACE FUNCTION public.seat_segment(_route text,_plat numeric,_plng numeric,_dlat numeric,_dlng numeric)
RETURNS TABLE(start_m double precision,end_m double precision) LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE route jsonb; a record; b record;
BEGIN
 IF _plat IS NULL OR _plng IS NULL OR _dlat IS NULL OR _dlng IS NULL THEN RETURN QUERY SELECT 0::double precision,1e15::double precision; RETURN; END IF;
 BEGIN
 route:=_route::jsonb;
 IF jsonb_typeof(route)<>'array' OR jsonb_array_length(route)<2 THEN RAISE EXCEPTION 'route'; END IF;
 SELECT * INTO a FROM public.route_position_m(route,_plng::double precision,_plat::double precision);
 SELECT * INTO b FROM public.route_position_m(route,_dlng::double precision,_dlat::double precision);
 IF a.progress_m IS NULL OR b.progress_m IS NULL OR a.distance_m>2000 OR b.distance_m>2000 OR b.progress_m<=a.progress_m THEN RAISE EXCEPTION 'projection'; END IF;
 RETURN QUERY SELECT a.progress_m,b.progress_m;
 EXCEPTION WHEN others THEN RETURN QUERY SELECT 0::double precision,1e15::double precision;
 END;
END; $$;

CREATE OR REPLACE FUNCTION public.segment_free_seats(_capacity integer,_segments jsonb,_start double precision,_end double precision)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 WITH intervals AS (SELECT (v->>0)::double precision a,(v->>1)::double precision b FROM jsonb_array_elements(coalesce(_segments,'[]'::jsonb)) v),
 points AS (SELECT _start x UNION SELECT a FROM intervals WHERE a>_start AND a<_end),
 occupancy AS (SELECT (SELECT count(*) FROM intervals WHERE a<=x AND b>x) n FROM points)
 SELECT greatest(0,_capacity-coalesce((SELECT max(n)::integer FROM occupancy),0));
$$;

CREATE OR REPLACE FUNCTION public.ride_segment_seats(_ride_id uuid,_pickup_lat numeric,_pickup_lng numeric,_dropoff_lat numeric,_dropoff_lng numeric,_exclude uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; s record; segments jsonb;
BEGIN
 SELECT * INTO r FROM public.rides WHERE id=_ride_id;
 IF NOT FOUND OR r.status NOT IN ('active','in_progress') THEN RETURN 0; END IF;
 SELECT * INTO s FROM public.seat_segment(r.route_polyline,_pickup_lat,_pickup_lng,_dropoff_lat,_dropoff_lng);
 SELECT coalesce(jsonb_agg(jsonb_build_array(coalesce(q.segment_start_m,0),coalesce(q.segment_end_m,1e15))),'[]'::jsonb) INTO segments FROM public.ride_requests q WHERE q.ride_id=r.id AND q.status IN ('accepted','driver_arrived','picked_up') AND (_exclude IS NULL OR q.id<>_exclude);
 RETURN public.segment_free_seats(coalesce(r.total_seats,r.available_seats),segments,s.start_m,s.end_m);
END; $$;
REVOKE ALL ON FUNCTION public.ride_segment_seats(uuid,numeric,numeric,numeric,numeric,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ride_segment_seats(uuid,numeric,numeric,numeric,numeric,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_ride_segment_seats(_ride_id uuid,_pickup_lat numeric,_pickup_lng numeric,_dropoff_lat numeric,_dropoff_lng numeric)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.rides r WHERE r.id=_ride_id AND (r.university_id IS NULL OR public.is_university_member(r.university_id))) THEN RETURN 0; END IF;
 IF NOT public.is_ride_joinable(_ride_id) THEN RETURN 0; END IF;
 RETURN public.ride_segment_seats(_ride_id,_pickup_lat,_pickup_lng,_dropoff_lat,_dropoff_lng);
END; $$;
REVOKE ALL ON FUNCTION public.get_ride_segment_seats(uuid,numeric,numeric,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ride_segment_seats(uuid,numeric,numeric,numeric,numeric) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.initialize_seat_capacity()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.total_seats:=NEW.available_seats; NEW.full_route_seats:=NEW.available_seats;
 ELSIF coalesce(current_setting('app.refresh_seats',true),'')<>'yes' THEN
 NEW.total_seats:=OLD.total_seats; NEW.available_seats:=OLD.available_seats; NEW.full_route_seats:=OLD.full_route_seats;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER initialize_seat_capacity BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.initialize_seat_capacity();

CREATE OR REPLACE FUNCTION public.guard_segment_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; s record; seats integer;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.ride_id IS DISTINCT FROM OLD.ride_id OR NEW.passenger_id IS DISTINCT FROM OLD.passenger_id) THEN RAISE EXCEPTION 'Rezerváciu nemožno presunúť'; END IF;
 SELECT * INTO r FROM public.rides WHERE id=NEW.ride_id FOR UPDATE;
 IF TG_OP='INSERT' OR NEW.pickup_lat IS DISTINCT FROM OLD.pickup_lat OR NEW.pickup_lng IS DISTINCT FROM OLD.pickup_lng OR NEW.dropoff_lat IS DISTINCT FROM OLD.dropoff_lat OR NEW.dropoff_lng IS DISTINCT FROM OLD.dropoff_lng THEN
 SELECT * INTO s FROM public.seat_segment(r.route_polyline,NEW.pickup_lat,NEW.pickup_lng,NEW.dropoff_lat,NEW.dropoff_lng);
 NEW.segment_start_m:=s.start_m; NEW.segment_end_m:=s.end_m;
 ELSE NEW.segment_start_m:=OLD.segment_start_m; NEW.segment_end_m:=OLD.segment_end_m; END IF;
 IF TG_OP='INSERT' OR (NEW.status IN ('accepted','driver_arrived','picked_up') AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.segment_start_m IS DISTINCT FROM OLD.segment_start_m OR NEW.segment_end_m IS DISTINCT FROM OLD.segment_end_m)) THEN
 IF r.status NOT IN ('active','in_progress') THEN RAISE EXCEPTION 'Jazda nie je dostupná'; END IF;
 seats:=public.ride_segment_seats(NEW.ride_id,NEW.pickup_lat,NEW.pickup_lng,NEW.dropoff_lat,NEW.dropoff_lng,NEW.id);
 IF seats<1 THEN RAISE EXCEPTION 'Na zvolenom úseku už nie je voľné miesto'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_segment_capacity BEFORE INSERT OR UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_segment_capacity();

UPDATE public.ride_requests q SET segment_start_m=s.start_m,segment_end_m=s.end_m FROM public.rides r CROSS JOIN LATERAL public.seat_segment(r.route_polyline,NULL,NULL,NULL,NULL) s WHERE q.ride_id=r.id;

CREATE OR REPLACE FUNCTION public.refresh_ride_seats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; cap integer; segments jsonb; full_free integer; any_free integer; old_setting text;
BEGIN
 IF TG_OP='DELETE' THEN rid:=OLD.ride_id; ELSE rid:=NEW.ride_id; END IF;
 SELECT total_seats INTO cap FROM public.rides WHERE id=rid FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_array(coalesce(segment_start_m,0),coalesce(segment_end_m,1e15))),'[]'::jsonb) INTO segments FROM public.ride_requests WHERE ride_id=rid AND status IN ('accepted','driver_arrived','picked_up');
 full_free:=public.segment_free_seats(cap,segments,0,1e15);
 WITH intervals AS (SELECT (v->>0)::double precision a,(v->>1)::double precision b FROM jsonb_array_elements(segments) v), points AS (SELECT 0::double precision x UNION SELECT b FROM intervals WHERE b<1e15), occupancy AS (SELECT (SELECT count(*) FROM intervals WHERE a<=x AND b>x) n FROM points)
 SELECT greatest(0,cap-coalesce(min(n)::integer,0)) INTO any_free FROM occupancy;
 old_setting:=coalesce(current_setting('app.refresh_seats',true),'');
 PERFORM set_config('app.refresh_seats','yes',true);
 UPDATE public.rides SET available_seats=any_free,full_route_seats=full_free WHERE id=rid;
 PERFORM set_config('app.refresh_seats',old_setting,true);
 RETURN NULL;
END; $$;
CREATE TRIGGER refresh_ride_seats AFTER INSERT OR UPDATE OR DELETE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.refresh_ride_seats();
REVOKE ALL ON FUNCTION public.guard_segment_capacity(), public.refresh_ride_seats(), public.initialize_seat_capacity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seat_segment(text,numeric,numeric,numeric,numeric),public.segment_free_seats(integer,jsonb,double precision,double precision) TO authenticated,service_role,supabase_read_only_user;
CREATE INDEX ride_requests_capacity_idx ON public.ride_requests(ride_id) WHERE status IN ('accepted','driver_arrived','picked_up');