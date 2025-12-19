-- Fix public_profiles view to respect RLS of underlying profiles table
-- Recreate view with security_invoker = true
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  car_model,
  car_color,
  rating,
  total_rides,
  selected_role,
  created_at
FROM public.profiles;

-- Grant access to authenticated users only
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;