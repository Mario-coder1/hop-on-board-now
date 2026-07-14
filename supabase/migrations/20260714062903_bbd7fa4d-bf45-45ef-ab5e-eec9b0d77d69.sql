
CREATE OR REPLACE FUNCTION public.admin_visitor_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
      (SELECT count(*) FROM public.page_views) AS total
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
$$;

GRANT EXECUTE ON FUNCTION public.admin_visitor_stats() TO authenticated;
