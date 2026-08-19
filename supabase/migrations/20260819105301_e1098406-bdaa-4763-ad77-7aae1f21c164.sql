CREATE OR REPLACE FUNCTION public.get_driver_profile_stats(_driver_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_rides', COALESCE((SELECT total_rides FROM public.profiles WHERE id = _driver_id), 0),
    'completed_rides', (SELECT count(*) FROM public.rides WHERE driver_id = _driver_id AND status = 'completed'),
    'cancelled_rides', (SELECT count(*) FROM public.rides WHERE driver_id = _driver_id AND status = 'cancelled'),
    'rating', (SELECT rating FROM public.profiles WHERE id = _driver_id),
    'review_count', (SELECT count(*) FROM public.ratings WHERE rated_user_id = _driver_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_driver_reviews(_driver_id uuid)
RETURNS TABLE(
  rating integer,
  comment text,
  created_at timestamp with time zone,
  rater_name text,
  rater_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.rating,
    r.comment,
    r.created_at,
    p.full_name,
    p.avatar_url
  FROM public.ratings r
  JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.rated_user_id = _driver_id
  ORDER BY r.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_profile_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_profile_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_reviews(uuid) TO service_role;