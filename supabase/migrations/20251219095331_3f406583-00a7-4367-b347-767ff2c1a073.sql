-- Create table for ride stops/waypoints
CREATE TABLE public.ride_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_stops ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can manage stops for their rides"
ON public.ride_stops
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.rides
    WHERE rides.id = ride_stops.ride_id
    AND rides.driver_id = current_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rides
    WHERE rides.id = ride_stops.ride_id
    AND rides.driver_id = current_profile_id()
  )
);

CREATE POLICY "Authenticated users can view stops for active rides"
ON public.ride_stops
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rides
    WHERE rides.id = ride_stops.ride_id
    AND rides.status IN ('active', 'in_progress')
  )
);

CREATE POLICY "Passengers can view stops for their rides"
ON public.ride_stops
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ride_requests rr
    JOIN public.rides r ON r.id = rr.ride_id
    WHERE r.id = ride_stops.ride_id
    AND rr.passenger_id = current_profile_id()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_ride_stops_ride_id ON public.ride_stops(ride_id);
CREATE INDEX idx_ride_stops_order ON public.ride_stops(ride_id, stop_order);