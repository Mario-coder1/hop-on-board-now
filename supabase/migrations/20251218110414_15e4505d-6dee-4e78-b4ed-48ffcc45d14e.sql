-- Fix RLS policies for security

-- 1. Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view active rides" ON public.rides;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view user locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can view locations" ON public.user_locations;

-- 2. Create proper profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Users can view profiles of people they share active rides with
CREATE POLICY "Users can view ride participant profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM public.ride_requests rr
      JOIN public.profiles p ON p.id = rr.passenger_id
      WHERE rr.ride_id = r.id
      AND p.user_id = auth.uid()
      AND rr.status IN ('pending', 'accepted', 'driver_arrived', 'picked_up', 'completed')
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.ride_requests rr
    WHERE rr.passenger_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM public.rides r
      JOIN public.profiles p ON p.id = r.driver_id
      WHERE r.id = rr.ride_id
      AND p.user_id = auth.uid()
    )
  )
);

-- Drivers of active rides are publicly visible (limited info needed for ride search)
CREATE POLICY "Authenticated users can view ride drivers" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = profiles.id
    AND r.status IN ('active', 'in_progress')
  )
);

-- 3. Create proper rides policies  
-- Authenticated users can view active rides
CREATE POLICY "Authenticated users can view active rides" ON public.rides
FOR SELECT TO authenticated
USING (status IN ('active', 'in_progress'));

-- Users can view their own rides (as driver)
CREATE POLICY "Drivers can view own rides" ON public.rides
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = rides.driver_id AND profiles.user_id = auth.uid())
);

-- Passengers can view rides they requested
CREATE POLICY "Passengers can view requested rides" ON public.rides
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ride_requests rr
    JOIN profiles p ON p.id = rr.passenger_id
    WHERE rr.ride_id = rides.id AND p.user_id = auth.uid()
  )
);

-- 4. Create proper user_locations policies
-- Users can view their own location
CREATE POLICY "Users can view own location" ON public.user_locations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = user_locations.profile_id AND profiles.user_id = auth.uid())
);

-- Users can view locations of drivers they have active rides with
CREATE POLICY "Passengers can view driver location" ON public.user_locations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.ride_requests rr ON rr.ride_id = r.id
    JOIN public.profiles p ON p.id = rr.passenger_id
    WHERE r.driver_id = user_locations.profile_id
    AND p.user_id = auth.uid()
    AND rr.status IN ('accepted', 'driver_arrived', 'picked_up')
    AND r.status = 'in_progress'
  )
);

-- 5. Add admin policies
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update profiles (for banning)
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.reports
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON public.reports
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 6. Add user_roles protection policies
CREATE POLICY "Only admins can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles" ON public.user_roles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 7. Add banned user enforcement to write operations
-- Drop existing INSERT policy for rides if it doesn't check banned status
DROP POLICY IF EXISTS "Drivers can create rides" ON public.rides;
CREATE POLICY "Non-banned drivers can create rides" ON public.rides
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = rides.driver_id 
    AND profiles.user_id = auth.uid()
    AND (profiles.banned = false OR profiles.banned IS NULL)
  )
);

-- Drop existing INSERT policy for ride_requests if exists
DROP POLICY IF EXISTS "Passengers can create ride requests" ON public.ride_requests;
CREATE POLICY "Non-banned passengers can create ride requests" ON public.ride_requests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = ride_requests.passenger_id 
    AND profiles.user_id = auth.uid()
    AND (profiles.banned = false OR profiles.banned IS NULL)
  )
);

-- 8. Validate full_name in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
BEGIN
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'User');
  -- Limit length to 100 chars
  v_full_name := LEFT(v_full_name, 100);
  -- Remove control characters
  v_full_name := REGEXP_REPLACE(v_full_name, E'[\\x00-\\x1F\\x7F]', '', 'g');
  
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, v_full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;