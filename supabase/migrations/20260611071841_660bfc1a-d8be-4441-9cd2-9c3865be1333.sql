CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(users bigint, rides bigint, rating numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles WHERE banned IS NOT TRUE) as users,
    (SELECT count(*) FROM public.rides WHERE status = 'completed') as rides,
    (SELECT round(avg(rating)::numeric, 1) FROM public.ratings) as rating;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO authenticated;
