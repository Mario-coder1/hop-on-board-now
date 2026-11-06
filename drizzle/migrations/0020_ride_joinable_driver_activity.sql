CREATE OR REPLACE FUNCTION public.is_ride_joinable(_ride_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id=_ride_id AND r.status IN ('active','in_progress')
      AND r.departure_time >= now() - interval '12 hours'
      AND (
        r.departure_time >= now() - interval '15 minutes'
        OR EXISTS (SELECT 1 FROM public.user_locations ul WHERE ul.profile_id=r.driver_id AND ul.updated_at >= now() - interval '15 minutes')
        OR EXISTS (SELECT 1 FROM public.driver_location_history h WHERE h.profile_id=r.driver_id AND h.recorded_at >= now() - interval '15 minutes')
        OR EXISTS (SELECT 1 FROM public.page_views pv WHERE pv.profile_id=r.driver_id AND pv.created_at >= now() - interval '15 minutes')
      )
  )
$$;
CREATE OR REPLACE FUNCTION public.filter_joinable_rides(_ids uuid[]) RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(array_agg(id),'{}') FROM unnest(_ids) id WHERE public.is_ride_joinable(id)
$$;
GRANT EXECUTE ON FUNCTION public.is_ride_joinable(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.filter_joinable_rides(uuid[]) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.block_request_on_departed_ride()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
 SELECT status INTO r FROM public.rides WHERE id = NEW.ride_id;
 IF NOT FOUND OR r.status IS NULL OR r.status NOT IN ('active', 'in_progress') THEN
  RAISE EXCEPTION 'Jazda nie je dostupná';
 END IF;
 IF NOT public.is_ride_joinable(NEW.ride_id) THEN
  RAISE EXCEPTION 'Táto jazda už skončila';
 END IF;
 RETURN NEW;
END $$;