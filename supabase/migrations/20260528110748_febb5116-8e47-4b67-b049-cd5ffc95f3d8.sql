-- Speed up driver dashboard query: rides WHERE driver_id = ? ORDER BY departure_time
CREATE INDEX IF NOT EXISTS idx_rides_driver_departure
  ON public.rides (driver_id, departure_time);

-- Speed up search/filter by status + time
CREATE INDEX IF NOT EXISTS idx_rides_status_departure
  ON public.rides (status, departure_time);

-- Speed up passenger lookups
CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger
  ON public.ride_requests (passenger_id, created_at DESC);

-- Speed up driver-side request lookups per ride
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_status
  ON public.ride_requests (ride_id, status);