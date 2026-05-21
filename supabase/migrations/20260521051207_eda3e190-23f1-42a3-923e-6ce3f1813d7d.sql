-- Add PIN verification columns to ride_requests
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS pin_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pin_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS driver_confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS passenger_confirmed_at timestamp with time zone;

-- Auto-generate a 4-digit PIN when a request is created (if not provided)
CREATE OR REPLACE FUNCTION public.generate_ride_request_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pin_code IS NULL OR length(NEW.pin_code) <> 4 THEN
    NEW.pin_code := lpad((floor(random() * 10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ride_request_pin ON public.ride_requests;
CREATE TRIGGER trg_generate_ride_request_pin
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ride_request_pin();

-- Backfill PINs for existing requests without one
UPDATE public.ride_requests
  SET pin_code = lpad((floor(random() * 10000))::int::text, 4, '0')
  WHERE pin_code IS NULL;

-- Server-side PIN verification (driver action)
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
        driver_confirmed_at = COALESCE(driver_confirmed_at, now())
  WHERE id = _request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;