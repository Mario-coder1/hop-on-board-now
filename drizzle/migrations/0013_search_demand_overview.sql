CREATE TABLE public.ride_search_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL,
 source text NOT NULL CHECK (source IN ('search','passenger','airport')),
 result_count integer NOT NULL CHECK (result_count >= 0 AND result_count <= 100000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ride_search_events TO authenticated;
GRANT ALL ON public.ride_search_events TO service_role;
ALTER TABLE public.ride_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read search metrics" ON public.ride_search_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ride_search_events_created_at_idx ON public.ride_search_events(created_at);
CREATE FUNCTION public.record_ride_search(p_session uuid, p_source text, p_results integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_session IS NULL OR p_source NOT IN ('search','passenger','airport') OR p_results IS NULL OR p_results < 0 OR p_results > 100000 THEN RAISE EXCEPTION 'Invalid search event'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_session::text));
 IF EXISTS (SELECT 1 FROM public.ride_search_events WHERE session_id=p_session AND created_at > now()-interval '10 seconds') THEN RETURN; END IF;
 INSERT INTO public.ride_search_events(session_id,source,result_count) VALUES(p_session,p_source,p_results);
END; $$;
REVOKE ALL ON FUNCTION public.record_ride_search(uuid,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ride_search(uuid,text,integer) TO anon,authenticated;
CREATE FUNCTION public.admin_search_overview(p_days integer DEFAULT 7) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE start_at timestamptz; output jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_days NOT IN (7,30,90) THEN RAISE EXCEPTION 'Invalid period'; END IF;
 start_at := date_trunc('day',now() AT TIME ZONE 'Europe/Bratislava') AT TIME ZONE 'Europe/Bratislava' - ((p_days-1) * interval '1 day');
 SELECT jsonb_build_object(
  'searches',count(*),'search_sessions',count(DISTINCT session_id),
  'no_results',count(*) FILTER(WHERE result_count=0),
  'tracking_since',(SELECT min(created_at) FROM public.ride_search_events),
  'requests',(SELECT count(*) FROM public.ride_requests WHERE created_at>=start_at),
  'confirmed',(SELECT count(*) FROM public.ride_requests WHERE created_at>=start_at AND status::text IN ('accepted','driver_arrived','picked_up','completed','no_show')),
  'daily',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.day),'[]'::jsonb) FROM (
   SELECT to_char(g.day,'YYYY-MM-DD') AS day,
   (SELECT count(*) FROM public.ride_search_events e WHERE (e.created_at AT TIME ZONE 'Europe/Bratislava')::date=g.day::date) AS searches,
   (SELECT count(*) FROM public.ride_search_events e WHERE (e.created_at AT TIME ZONE 'Europe/Bratislava')::date=g.day::date AND e.result_count=0) AS no_results,
   (SELECT count(*) FROM public.ride_requests r WHERE (r.created_at AT TIME ZONE 'Europe/Bratislava')::date=g.day::date) AS requests
   FROM generate_series(start_at AT TIME ZONE 'Europe/Bratislava',now() AT TIME ZONE 'Europe/Bratislava',interval '1 day') g(day)
  ) d),
  'sources',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM (
   SELECT source,count(*) AS searches,count(*) FILTER(WHERE result_count=0) AS no_results FROM public.ride_search_events WHERE created_at>=start_at GROUP BY source ORDER BY count(*) DESC
  ) s)
 ) INTO output FROM public.ride_search_events WHERE created_at>=start_at;
 RETURN output;
END; $$;
REVOKE ALL ON FUNCTION public.admin_search_overview(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_search_overview(integer) TO authenticated;