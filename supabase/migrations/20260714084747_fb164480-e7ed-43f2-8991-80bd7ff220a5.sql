
DROP POLICY IF EXISTS "Users can create ratings for completed rides only" ON public.ratings;

CREATE POLICY "Users can create ratings for completed rides only"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  rater_id = current_profile_id()
  AND rater_id <> rated_user_id
  AND EXISTS (
    SELECT 1
    FROM ride_requests rr
    JOIN rides r ON r.id = rr.ride_id
    WHERE rr.id = ratings.ride_request_id
      AND rr.status IN ('completed'::request_status, 'picked_up'::request_status)
      AND (
        (rr.passenger_id = ratings.rater_id AND r.driver_id = ratings.rated_user_id)
        OR (r.driver_id = ratings.rater_id AND rr.passenger_id = ratings.rated_user_id)
      )
  )
);
