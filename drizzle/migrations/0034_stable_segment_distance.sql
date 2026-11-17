CREATE OR REPLACE FUNCTION public.seat_position(_route jsonb,_lng numeric,_lat numeric)
RETURNS TABLE(progress_m double precision,distance_m double precision) LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE i integer; a jsonb; b jsonb; ax float8; ay float8; bx float8; byv float8; dx float8; dy float8; t float8; len float8; dist float8; total float8:=0; best float8:='Infinity'; pos float8:=0; kx float8;
BEGIN
 IF jsonb_typeof(_route)<>'array' OR jsonb_array_length(_route)<2 THEN RETURN; END IF;
 kx:=111320*cos(radians((_route->0->>1)::float8));
 FOR i IN 1..jsonb_array_length(_route)-1 LOOP
 a:=_route->(i-1); b:=_route->i;
 ax:=((a->>0)::float8-_lng)*kx; ay:=((a->>1)::float8-_lat)*110540;
 bx:=((b->>0)::float8-_lng)*kx; byv:=((b->>1)::float8-_lat)*110540;
 dx:=bx-ax; dy:=byv-ay; len:=sqrt(dx*dx+dy*dy);
 t:=CASE WHEN len>0 THEN greatest(0,least(1,-(ax*dx+ay*dy)/(len*len))) ELSE 0 END;
 dist:=sqrt(power(ax+t*dx,2)+power(ay+t*dy,2));
 IF dist<best THEN best:=dist; pos:=total+t*len; END IF;
 total:=total+len;
 END LOOP; RETURN QUERY SELECT pos,best;
 EXCEPTION WHEN others THEN RETURN;
END $$;
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='seat_segment';
 EXECUTE replace(d,'public.route_position_m','public.seat_position');
 SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='guard_segment_capacity';
 d:=replace(d,$str$IF TG_OP='INSERT' OR NEW.pickup_lat$str$,$str$IF TG_OP='INSERT' OR OLD.segment_end_m=1e15 OR NEW.pickup_lat$str$);
 EXECUTE d;
END $$;
CREATE OR REPLACE FUNCTION public.guard_confirmed_segment_locations() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.status IN ('accepted','driver_arrived','picked_up','completed') AND (NEW.pickup_lat IS DISTINCT FROM OLD.pickup_lat OR NEW.pickup_lng IS DISTINCT FROM OLD.pickup_lng OR NEW.dropoff_lat IS DISTINCT FROM OLD.dropoff_lat OR NEW.dropoff_lng IS DISTINCT FROM OLD.dropoff_lng) THEN RAISE EXCEPTION 'Dohodnuté miesta potvrdenej rezervácie nemožno meniť'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_confirmed_segment_locations BEFORE UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_confirmed_segment_locations();
UPDATE public.ride_requests SET segment_start_m=segment_start_m WHERE segment_end_m=1e15;
GRANT EXECUTE ON FUNCTION public.seat_position(jsonb,numeric,numeric) TO authenticated,service_role,supabase_read_only_user;