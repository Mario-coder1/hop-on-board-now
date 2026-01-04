-- Add badge column to profiles table for public display
ALTER TABLE public.profiles ADD COLUMN badge text;

-- Add badge to public_profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
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

-- Set Developer badge for the user
UPDATE public.profiles 
SET badge = 'Developer' 
WHERE id = 'a0ff33ad-05b0-4ff7-a021-cefc40859819';