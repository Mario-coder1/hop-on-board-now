-- Create helper function to check if user is driver of a ride (breaks RLS cycle)
CREATE OR REPLACE FUNCTION public.is_ride_driver(_ride_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rides
    WHERE id = _ride_id
      AND driver_id = current_profile_id()
  )
$$;

-- Create helper function to check if user has a request for a ride (breaks RLS cycle)
CREATE OR REPLACE FUNCTION public.has_ride_request(_ride_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ride_requests
    WHERE ride_id = _ride_id
      AND passenger_id = current_profile_id()
  )
$$;

-- Drop problematic ride_requests policies
DROP POLICY IF EXISTS "Users can view relevant requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can update relevant requests" ON public.ride_requests;

-- Recreate without circular dependency
CREATE POLICY "Passengers can view own requests"
ON public.ride_requests
FOR SELECT
USING (passenger_id = current_profile_id());

CREATE POLICY "Drivers can view requests for their rides"
ON public.ride_requests
FOR SELECT
USING (is_ride_driver(ride_id));

CREATE POLICY "Passengers can update own requests"
ON public.ride_requests
FOR UPDATE
USING (passenger_id = current_profile_id());

CREATE POLICY "Drivers can update requests for their rides"
ON public.ride_requests
FOR UPDATE
USING (is_ride_driver(ride_id));

-- Drop and recreate rides policy that was causing cycle
DROP POLICY IF EXISTS "Passengers can view requested rides" ON public.rides;

CREATE POLICY "Passengers can view requested rides"
ON public.rides
FOR SELECT
USING (has_ride_request(id));