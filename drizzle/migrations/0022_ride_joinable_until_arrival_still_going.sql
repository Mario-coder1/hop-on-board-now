ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS still_going_asked_at timestamptz;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS still_going_until timestamptz;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS still_going_declined_at timestamptz;

-- Odhad času cesty po cestách z uloženej trasy (~70 km/h), inak vzdušná čiara × 1,3
CREATE OR REPLACE FUNCTION public.ride_est_duration(_ride_id uuid) RETURNS interval LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; route jsonb; pt jsonb; prev jsonb; km numeric:=0; BEGIN
SELECT origin_lat,origin_lng,destination_lat,destination_lng,route_polyline INTO r FROM public.rides WHERE id=_ride_id;
IF NOT FOUND THEN RETURN interval '1 hour'; END IF;
BEGIN route:=r.route_polyline::jsonb; EXCEPTION WHEN others THEN route:=NULL; END;
IF jsonb_typeof(route)='array' AND jsonb_array_length(route)>1 THEN
  FOR pt IN SELECT value FROM jsonb_array_elements(route) LOOP
    IF prev IS NOT NULL THEN km:=km+public.company_distance_km((prev->>1)::numeric,(prev->>0)::numeric,(pt->>1)::numeric,(pt->>0)::numeric); END IF;
    prev:=pt; END LOOP;
ELSE km:=public.company_distance_km(r.origin_lat,r.origin_lng,r.destination_lat,r.destination_lng)*1.3; END IF;
RETURN make_interval(mins => greatest(15, ceil(km/70*60)::int));
END $$;

CREATE OR REPLACE FUNCTION public.is_ride_joinable(_ride_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id=_ride_id AND r.status IN ('active','in_progress')
      AND r.still_going_declined_at IS NULL
      AND r.departure_time >= now() - interval '24 hours'
      AND (now() <= r.departure_time + public.ride_est_duration(r.id) OR r.still_going_until > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.answer_ride_still_going(_ride_id uuid, _going boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public.is_ride_driver(_ride_id) THEN RAISE EXCEPTION 'Nie ste vodič tejto jazdy'; END IF;
IF _going THEN
  UPDATE public.rides SET still_going_until=now()+greatest(interval '1 hour', public.ride_est_duration(_ride_id)), still_going_declined_at=NULL, still_going_asked_at=now() WHERE id=_ride_id;
ELSE
  UPDATE public.rides SET still_going_declined_at=now(), still_going_until=NULL WHERE id=_ride_id;
END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.answer_ride_still_going(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_ride_still_going(uuid,boolean) TO authenticated;

-- Volá cron: po uplynutí času cesty sa vodiča opýta, či jazda ide
CREATE OR REPLACE FUNCTION public.ask_rides_still_going() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n int:=0; route text; BEGIN
FOR r IN SELECT id, driver_id, origin_address, destination_address FROM public.rides
  WHERE status IN ('active','in_progress') AND still_going_declined_at IS NULL
    AND departure_time >= now()-interval '24 hours'
    AND now() > departure_time + public.ride_est_duration(id)
    AND (still_going_until IS NULL OR still_going_until <= now())
    AND (still_going_asked_at IS NULL OR still_going_asked_at < coalesce(still_going_until, departure_time + public.ride_est_duration(id)))
  LIMIT 200 LOOP
  route := split_part(r.origin_address,',',1)||' → '||split_part(r.destination_address,',',1);
  UPDATE public.rides SET still_going_asked_at=now() WHERE id=r.id;
  INSERT INTO public.notifications(profile_id,title,message) VALUES (r.driver_id,'Ide ešte táto jazda?',route||': čas jazdy uplynul. Klikni a potvrď, či jazda ide. Kým nepotvrdíš, nikto sa nemôže pripojiť.');
  BEGIN PERFORM public.send_push_via_edge(r.driver_id,'Ide ešte táto jazda?',route||': klikni a potvrď. Ak ide, ostane aktívna. Ak nie, pripojenie sa zablokuje.',jsonb_build_object('url','/my-rides','ride_id',r.id)); EXCEPTION WHEN others THEN NULL; END;
  n:=n+1;
END LOOP;
RETURN n; END $$;
REVOKE EXECUTE ON FUNCTION public.ask_rides_still_going() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ask_rides_still_going() TO service_role;