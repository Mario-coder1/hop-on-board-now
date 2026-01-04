-- Fix the security definer view issue by dropping and recreating without security definer
DROP VIEW IF EXISTS public.public_profiles;

-- Create the view as a simple view (invoker's security context)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  car_model,
  car_color,
  selected_role,
  total_rides,
  rating,
  badge,
  created_at
FROM public.profiles;