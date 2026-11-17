CREATE OR REPLACE FUNCTION public.seat_segment(_route text,_plat numeric,_plng numeric,_dlat numeric,_dlng numeric)
RETURNS TABLE(start_m double precision,end_m double precision) LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE route jsonb; a record; b record;
BEGIN
 IF _plat IS NULL OR _plng IS NULL OR _dlat IS NULL OR _dlng IS NULL THEN RETURN QUERY SELECT 0::double precision,1e15::double precision; RETURN; END IF;
 BEGIN
 route:=_route::jsonb;
 IF jsonb_typeof(route)<>'array' OR jsonb_array_length(route)<2 THEN RAISE EXCEPTION 'route'; END IF;
 SELECT * INTO a FROM public.route_position_m(route,_plng,_plat);
 SELECT * INTO b FROM public.route_position_m(route,_dlng,_dlat);
 IF a.progress_m IS NULL OR b.progress_m IS NULL OR a.distance_m>2000 OR b.distance_m>2000 OR b.progress_m<=a.progress_m THEN RAISE EXCEPTION 'projection'; END IF;
 RETURN QUERY SELECT a.progress_m,b.progress_m;
 EXCEPTION WHEN others THEN RETURN QUERY SELECT 0::double precision,1e15::double precision;
 END;
END; $$;
