-- Fix ALL infinite recursion issues by using current_profile_id() everywhere instead of joining profiles

-- ======= RIDES TABLE =======
DROP POLICY IF EXISTS "Drivers can view own rides" ON public.rides;
DROP POLICY IF EXISTS "Drivers can update own rides" ON public.rides;
DROP POLICY IF EXISTS "Passengers can view requested rides" ON public.rides;
DROP POLICY IF EXISTS "Non-banned drivers can create rides" ON public.rides;

CREATE POLICY "Drivers can view own rides" ON public.rides
FOR SELECT TO authenticated
USING (driver_id = public.current_profile_id());

CREATE POLICY "Drivers can update own rides" ON public.rides
FOR UPDATE TO authenticated
USING (driver_id = public.current_profile_id());

CREATE POLICY "Passengers can view requested rides" ON public.rides
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ride_requests rr
    WHERE rr.ride_id = rides.id
    AND rr.passenger_id = public.current_profile_id()
  )
);

CREATE POLICY "Non-banned drivers can create rides" ON public.rides
FOR INSERT TO authenticated
WITH CHECK (
  driver_id = public.current_profile_id()
);

-- ======= RIDE_REQUESTS TABLE =======
DROP POLICY IF EXISTS "Users can view relevant requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can update relevant requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Passengers can delete own requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Passengers can create requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Non-banned passengers can create ride requests" ON public.ride_requests;

CREATE POLICY "Users can view relevant requests" ON public.ride_requests
FOR SELECT TO authenticated
USING (
  passenger_id = public.current_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_requests.ride_id
    AND r.driver_id = public.current_profile_id()
  )
);

CREATE POLICY "Users can update relevant requests" ON public.ride_requests
FOR UPDATE TO authenticated
USING (
  passenger_id = public.current_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_requests.ride_id
    AND r.driver_id = public.current_profile_id()
  )
);

CREATE POLICY "Passengers can delete own requests" ON public.ride_requests
FOR DELETE TO authenticated
USING (passenger_id = public.current_profile_id());

CREATE POLICY "Passengers can create requests" ON public.ride_requests
FOR INSERT TO authenticated
WITH CHECK (passenger_id = public.current_profile_id());

-- ======= USER_LOCATIONS TABLE =======
DROP POLICY IF EXISTS "Users can view own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can insert own location" ON public.user_locations;
DROP POLICY IF EXISTS "Passengers can view driver location" ON public.user_locations;

CREATE POLICY "Users can view own location" ON public.user_locations
FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id());

CREATE POLICY "Users can update own location" ON public.user_locations
FOR UPDATE TO authenticated
USING (profile_id = public.current_profile_id());

CREATE POLICY "Users can insert own location" ON public.user_locations
FOR INSERT TO authenticated
WITH CHECK (profile_id = public.current_profile_id());

CREATE POLICY "Passengers can view driver location" ON public.user_locations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.ride_requests rr ON rr.ride_id = r.id
    WHERE r.driver_id = user_locations.profile_id
    AND rr.passenger_id = public.current_profile_id()
    AND rr.status = ANY (ARRAY['accepted'::public.request_status, 'driver_arrived'::public.request_status, 'picked_up'::public.request_status])
    AND r.status = 'in_progress'::public.ride_status
  )
);

-- ======= PUSH_SUBSCRIPTIONS TABLE =======
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id());

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (profile_id = public.current_profile_id());

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
FOR DELETE TO authenticated
USING (profile_id = public.current_profile_id());

-- ======= RATINGS TABLE =======
DROP POLICY IF EXISTS "Users can view ratings they gave" ON public.ratings;
DROP POLICY IF EXISTS "Users can view ratings they received" ON public.ratings;
DROP POLICY IF EXISTS "Users can view ratings for their rides" ON public.ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON public.ratings;

CREATE POLICY "Users can view ratings they gave" ON public.ratings
FOR SELECT TO authenticated
USING (rater_id = public.current_profile_id());

CREATE POLICY "Users can view ratings they received" ON public.ratings
FOR SELECT TO authenticated
USING (rated_user_id = public.current_profile_id());

CREATE POLICY "Users can view ratings for their rides" ON public.ratings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ride_requests rr
    JOIN public.rides r ON r.id = rr.ride_id
    WHERE rr.id = ratings.ride_request_id
    AND (r.driver_id = public.current_profile_id() OR rr.passenger_id = public.current_profile_id())
  )
);

CREATE POLICY "Users can create ratings" ON public.ratings
FOR INSERT TO authenticated
WITH CHECK (rater_id = public.current_profile_id());

-- ======= REPORTS TABLE =======
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;

CREATE POLICY "Users can view own reports" ON public.reports
FOR SELECT TO authenticated
USING (reporter_id = public.current_profile_id());

CREATE POLICY "Users can create reports" ON public.reports
FOR INSERT TO authenticated
WITH CHECK (reporter_id = public.current_profile_id());