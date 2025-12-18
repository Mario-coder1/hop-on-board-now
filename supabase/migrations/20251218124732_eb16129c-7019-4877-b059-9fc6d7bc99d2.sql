-- Fix: Allow passengers to view driver location when ride is active OR in_progress
DROP POLICY IF EXISTS "Passengers can view driver location" ON public.user_locations;

CREATE POLICY "Passengers can view driver location" 
ON public.user_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.rides r
    JOIN public.ride_requests rr ON rr.ride_id = r.id
    WHERE r.driver_id = user_locations.profile_id
      AND rr.passenger_id = current_profile_id()
      AND rr.status IN ('accepted', 'driver_arrived', 'picked_up')
      AND r.status IN ('active', 'in_progress')
  )
);