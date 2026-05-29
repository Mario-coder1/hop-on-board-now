-- Restrict driver visibility into passenger profile (incl. phone) to confirmed statuses only.
DROP POLICY IF EXISTS "Drivers can view passenger profile for their rides" ON public.profiles;

CREATE POLICY "Drivers can view passenger profile for confirmed rides"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM rides r
    JOIN ride_requests rr ON rr.ride_id = r.id
    WHERE rr.passenger_id = profiles.id
      AND r.driver_id = current_profile_id()
      AND rr.status IN ('accepted'::request_status, 'driver_arrived'::request_status, 'picked_up'::request_status, 'completed'::request_status)
  )
);