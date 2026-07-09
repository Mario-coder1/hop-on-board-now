
-- Harden ratings INSERT: require ride_request_id to link rater and rated user in a completed ride
DROP POLICY IF EXISTS "Users can create ratings" ON public.ratings;

CREATE POLICY "Users can create ratings for completed rides only"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  rater_id = public.current_profile_id()
  AND rater_id <> rated_user_id
  AND EXISTS (
    SELECT 1
    FROM public.ride_requests rr
    JOIN public.rides r ON r.id = rr.ride_id
    WHERE rr.id = ratings.ride_request_id
      AND rr.status IN ('completed','picked_up')
      AND r.status = 'completed'
      AND (
        (rr.passenger_id = ratings.rater_id AND r.driver_id = ratings.rated_user_id)
        OR
        (r.driver_id = ratings.rater_id AND rr.passenger_id = ratings.rated_user_id)
      )
  )
);
