-- Add RLS policy to allow passengers to view driver profiles for their accepted rides
CREATE POLICY "Passengers can view driver profile for accepted rides"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM rides r
    JOIN ride_requests rr ON rr.ride_id = r.id
    WHERE r.driver_id = profiles.id
      AND rr.passenger_id = current_profile_id()
      AND rr.status IN ('accepted', 'driver_arrived', 'picked_up', 'completed')
  )
);