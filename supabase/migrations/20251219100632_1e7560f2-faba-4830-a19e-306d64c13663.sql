-- Add dropoff location fields to ride_requests
ALTER TABLE public.ride_requests
ADD COLUMN dropoff_address text,
ADD COLUMN dropoff_lat numeric,
ADD COLUMN dropoff_lng numeric;