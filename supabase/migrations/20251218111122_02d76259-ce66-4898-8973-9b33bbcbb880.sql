-- Create a secure view for public profile data (without sensitive info)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
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
  -- Intentionally excluding: phone, license_plate, banned, ban_reason, banned_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Update profiles policies to be more restrictive about phone/license_plate visibility
-- Only show full profile (with phone) for ACCEPTED ride relationships

-- Drop the existing participant policy
DROP POLICY IF EXISTS "Users can view ride participant profiles" ON public.profiles;

-- Create new policy: only show full profile for accepted/confirmed rides
CREATE POLICY "Users can view confirmed ride participant profiles" ON public.profiles
FOR SELECT USING (
  -- Users in accepted rides as passenger can see driver
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM public.ride_requests rr
      JOIN public.profiles p ON p.id = rr.passenger_id
      WHERE rr.ride_id = r.id
      AND p.user_id = auth.uid()
      AND rr.status IN ('accepted', 'driver_arrived', 'picked_up', 'completed')
    )
  )
  -- Or drivers can see their accepted passengers
  OR EXISTS (
    SELECT 1 FROM public.ride_requests rr
    WHERE rr.passenger_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM public.rides r
      JOIN public.profiles p ON p.id = r.driver_id
      WHERE r.id = rr.ride_id
      AND p.user_id = auth.uid()
      AND rr.status IN ('accepted', 'driver_arrived', 'picked_up', 'completed')
    )
  )
);