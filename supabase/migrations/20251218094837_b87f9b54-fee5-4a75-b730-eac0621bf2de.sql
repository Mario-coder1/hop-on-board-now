-- Allow passengers to delete their own ride requests (for cancellation)
CREATE POLICY "Passengers can delete own requests" 
ON public.ride_requests 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = ride_requests.passenger_id 
  AND profiles.user_id = auth.uid()
));