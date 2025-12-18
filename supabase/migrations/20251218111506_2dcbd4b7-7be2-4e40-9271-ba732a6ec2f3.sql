-- Fix ratings table RLS - restrict to participants only
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;

-- Users can view ratings they gave
CREATE POLICY "Users can view ratings they gave" ON public.ratings
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = ratings.rater_id AND profiles.user_id = auth.uid())
);

-- Users can view ratings they received
CREATE POLICY "Users can view ratings they received" ON public.ratings
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = ratings.rated_user_id AND profiles.user_id = auth.uid())
);

-- Users can view ratings for rides they participated in (as driver or passenger)
CREATE POLICY "Users can view ratings for their rides" ON public.ratings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ride_requests rr
    JOIN rides r ON r.id = rr.ride_id
    JOIN profiles p ON (p.id = r.driver_id OR p.id = rr.passenger_id)
    WHERE rr.id = ratings.ride_request_id
    AND p.user_id = auth.uid()
  )
);