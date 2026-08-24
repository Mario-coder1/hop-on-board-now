CREATE TABLE IF NOT EXISTS public.page_views_daily (
  day date NOT NULL,
  path text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  visitors integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);

GRANT SELECT ON public.page_views_daily TO authenticated;
GRANT ALL ON public.page_views_daily TO service_role;
ALTER TABLE public.page_views_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view daily page views" ON public.page_views_daily;
CREATE POLICY "Admins can view daily page views"
ON public.page_views_daily FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views (created_at);

CREATE OR REPLACE FUNCTION public.rollup_page_views(_older_than interval DEFAULT interval '30 days')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - _older_than;
  v_deleted integer;
BEGIN
  WITH moved AS (
    DELETE FROM public.page_views
    WHERE created_at < v_cutoff
    RETURNING created_at, path, session_id
  ), agg AS (
    SELECT date_trunc('day', created_at)::date AS day,
           path,
           count(*)::int AS views,
           count(DISTINCT session_id)::int AS visitors
    FROM moved
    GROUP BY 1, 2
  )
  INSERT INTO public.page_views_daily (day, path, views, visitors)
  SELECT day, path, views, visitors FROM agg
  ON CONFLICT (day, path) DO UPDATE
    SET views = public.page_views_daily.views + EXCLUDED.views,
        visitors = public.page_views_daily.visitors + EXCLUDED.visitors;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_page_views(interval) FROM PUBLIC, anon, authenticated;

SELECT public.rollup_page_views(interval '30 days');

SELECT cron.unschedule('rollup-page-views-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rollup-page-views-daily');

SELECT cron.schedule(
  'rollup-page-views-daily',
  '30 3 * * *',
  $$SELECT public.rollup_page_views(interval '30 days');$$
);

CREATE OR REPLACE FUNCTION public.admin_visitor_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_today_start timestamptz := date_trunc('day', now());
  v_24h timestamptz := now() - interval '24 hours';
  v_7d timestamptz := now() - interval '7 days';
  v_14d timestamptz := now() - interval '14 days';
  v_30d timestamptz := now() - interval '30 days';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH totals AS (
    SELECT
      count(*) FILTER (WHERE created_at >= v_today_start) AS today,
      count(*) FILTER (WHERE created_at >= v_24h) AS h24,
      count(*) FILTER (WHERE created_at >= v_7d) AS d7,
      count(DISTINCT session_id) FILTER (WHERE created_at >= v_7d) AS unique_sessions_7d,
      count(DISTINCT profile_id) FILTER (WHERE created_at >= v_7d AND profile_id IS NOT NULL) AS known_users_7d,
      (SELECT count(*) FROM public.page_views)
        + COALESCE((SELECT sum(views) FROM public.page_views_daily), 0) AS total
    FROM public.page_views
    WHERE created_at >= v_7d
  ),
  daily AS (
    SELECT
      to_char(date_trunc('day', created_at), 'MM-DD') AS date,
      count(*) AS views,
      count(DISTINCT session_id) AS visitors
    FROM public.page_views
    WHERE created_at >= v_14d
    GROUP BY 1
    ORDER BY 1
  ),
  top_paths AS (
    SELECT path, count(*) AS views
    FROM public.page_views
    WHERE created_at >= v_30d
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'today', (SELECT today FROM totals),
    'h24', (SELECT h24 FROM totals),
    'd7', (SELECT d7 FROM totals),
    'total', (SELECT total FROM totals),
    'unique_sessions_7d', (SELECT unique_sessions_7d FROM totals),
    'known_users_7d', (SELECT known_users_7d FROM totals),
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'views', views, 'visitors', visitors)) FROM daily), '[]'::jsonb),
    'top_paths', COALESCE((SELECT jsonb_agg(jsonb_build_object('path', path, 'views', views)) FROM top_paths), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;