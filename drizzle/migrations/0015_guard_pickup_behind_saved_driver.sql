CREATE OR REPLACE FUNCTION public.route_position_m(_route jsonb, _lng numeric, _lat numeric)
RETURNS TABLE(progress_m double precision, distance_m double precision)
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE i integer; a jsonb; b jsonb; ax double precision; ay double precision; bx double precision; b_y double precision; dx double precision; dy double precision; t double precision; len double precision; dist double precision; total double precision:=0; best double precision:='Infinity'; pos double precision:=0; kx double precision:=111320*cos(radians(_lat::double precision));
BEGIN
 IF jsonb_typeof(_route)<>'array' OR jsonb_array_length(_route)<2 THEN RETURN; END IF;
 FOR i IN 1..jsonb_array_length(_route)-1 LOOP
 a:=_route->(i-1); b:=_route->i;
 ax:=((a->>0)::double precision-_lng)*kx; ay:=((a->>1)::double precision-_lat)*110540;
 bx:=((b->>0)::double precision-_lng)*kx; b_y:=((b->>1)::double precision-_lat)*110540;
 dx:=bx-ax; dy:=b_y-ay; len:=sqrt(dx*dx+dy*dy);
 t:=CASE WHEN len>0 THEN greatest(0,least(1,-(ax*dx+ay*dy)/(len*len))) ELSE 0 END;
 dist:=sqrt(power(ax+t*dx,2)+power(ay+t*dy,2));
 IF dist<best THEN best:=dist; pos:=total+t*len; END IF;
 total:=total+len;
 END LOOP;
 RETURN QUERY SELECT pos,best;
 EXCEPTION WHEN others THEN RETURN;
END $$;
REVOKE ALL ON FUNCTION public.route_position_m(jsonb,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.route_position_m(jsonb,numeric,numeric) TO service_role;
CREATE OR REPLACE FUNCTION public.is_pickup_passed(_ride_id uuid,_pickup_lat numeric,_pickup_lng numeric)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; l record; route jsonb; driver_pos record; pickup_pos record;
BEGIN
 IF auth.uid() IS NULL AND coalesce(auth.role(),'')<>'service_role' THEN RETURN false; END IF;
 SELECT * INTO r FROM public.rides WHERE id=_ride_id;
 IF NOT FOUND OR r.status NOT IN ('active','in_progress') THEN RETURN false; END IF;
 IF r.university_id IS NOT NULL AND coalesce(auth.role(),'')<>'service_role' AND NOT public.is_university_member(r.university_id) THEN RETURN false; END IF;
 SELECT * INTO l FROM public.user_locations WHERE profile_id=r.driver_id;
 IF NOT FOUND OR l.updated_at<greatest(r.created_at,r.departure_time) OR l.updated_at>now()+interval '1 minute' THEN RETURN false; END IF;
 BEGIN route:=r.route_polyline::jsonb; EXCEPTION WHEN others THEN RETURN false; END;
 SELECT * INTO driver_pos FROM public.route_position_m(route,l.lng,l.lat);
 SELECT * INTO pickup_pos FROM public.route_position_m(route,_pickup_lng,_pickup_lat);
 RETURN coalesce(driver_pos.distance_m<=2000 AND pickup_pos.distance_m<=greatest(r.max_detour_km,15)*1000 AND driver_pos.progress_m>pickup_pos.progress_m+1000,false);
END $$;
REVOKE ALL ON FUNCTION public.is_pickup_passed(uuid,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_pickup_passed(uuid,numeric,numeric) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_passed_pickup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.is_pickup_passed(NEW.ride_id,NEW.pickup_lat,NEW.pickup_lng) THEN
 RAISE EXCEPTION 'Vodič podľa poslednej uloženej polohy už prešiel vaše miesto nastúpenia. Vyberte miesto ďalej po trase.';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_passed_pickup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_new_pickup_position BEFORE INSERT ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_passed_pickup();