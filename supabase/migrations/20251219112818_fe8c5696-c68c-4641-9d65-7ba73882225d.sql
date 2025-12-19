-- Add RLS policy to allow drivers to view passenger profiles for their rides
CREATE POLICY "Drivers can view passenger profile for their rides"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM rides r
    JOIN ride_requests rr ON rr.ride_id = r.id
    WHERE rr.passenger_id = profiles.id
      AND r.driver_id = current_profile_id()
      AND rr.status IN ('pending', 'accepted', 'driver_arrived', 'picked_up', 'completed')
  )
);