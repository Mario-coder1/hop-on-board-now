-- Add policy to allow viewing basic driver info for active rides
-- This is necessary for ride browsing functionality
CREATE POLICY "Authenticated users can view active ride driver basic info" ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Only for drivers with active rides
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = profiles.id
    AND r.status = 'active'
  )
  -- User hasn't requested this ride yet (if they have, other policies apply)
  AND NOT EXISTS (
    SELECT 1 FROM public.ride_requests rr
    JOIN public.profiles p ON p.id = rr.passenger_id
    JOIN public.rides r ON r.id = rr.ride_id
    WHERE r.driver_id = profiles.id
    AND p.user_id = auth.uid()
  )
);