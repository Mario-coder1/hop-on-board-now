-- Fix infinite recursion in profiles RLS policies by removing self-joins

-- 1) Helper function: map current auth user -> their profile id (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 2) Remove the recursive policies
DROP POLICY IF EXISTS "Authenticated users can view active ride driver basic info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view confirmed ride participant profiles" ON public.profiles;

-- 3) Recreate confirmed-participant policy WITHOUT referencing profiles inside the policy
CREATE POLICY "Users can view confirmed ride participant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Always allow self
  auth.uid() = user_id
  OR
  -- Always allow admins
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  (
    public.current_profile_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.ride_requests rr
      JOIN public.rides r ON r.id = rr.ride_id
      WHERE rr.status = ANY (
        ARRAY[
          'accepted'::public.request_status,
          'driver_arrived'::public.request_status,
          'picked_up'::public.request_status,
          'completed'::public.request_status
        ]
      )
      AND (
        -- Passenger can view their driver's profile
        (r.driver_id = profiles.id AND rr.passenger_id = public.current_profile_id())
        OR
        -- Driver can view their passenger's profile
        (rr.passenger_id = profiles.id AND r.driver_id = public.current_profile_id())
      )
    )
  )
);
