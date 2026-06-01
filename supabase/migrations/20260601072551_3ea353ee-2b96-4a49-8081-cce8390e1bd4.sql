-- Update verify_ride_request_pin to auto-promote ride to picked_up
-- When driver verifies PIN, passenger is logically present — no extra confirmation needed
CREATE OR REPLACE FUNCTION public.verify_ride_request_pin(_request_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
BEGIN
  SELECT rr.id, rr.pin_code, rr.pin_used, rr.pin_verified_at, rr.status, r.driver_id
    INTO v_req
  FROM public.ride_requests rr
  JOIN public.rides r ON r.id = rr.ride_id
  WHERE rr.id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_req.driver_id <> public.current_profile_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF v_req.pin_used = true OR v_req.pin_verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  IF v_req.pin_code IS DISTINCT FROM _pin THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  UPDATE public.ride_requests
    SET pin_verified_at = now(),
        pin_used = true,
        driver_confirmed_at = COALESCE(driver_confirmed_at, now()),
        passenger_confirmed_at = COALESCE(passenger_confirmed_at, now()),
        status = 'picked_up'
  WHERE id = _request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;