
-- Repurpose cold_start_eligible -> means "user opted in"
-- Drop auto-assignment trigger (no longer auto-eligible at signup)
DROP TRIGGER IF EXISTS trg_assign_cold_start_eligibility ON public.profiles;
DROP FUNCTION IF EXISTS public.assign_cold_start_eligibility();

-- Add timestamp when user opted in
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cold_start_activated_at timestamptz;

-- Backfill: any profile currently marked eligible (auto-assigned earlier) keeps opted-in state
UPDATE public.profiles
  SET cold_start_activated_at = COALESCE(cold_start_activated_at, created_at)
  WHERE cold_start_eligible = true AND cold_start_activated_at IS NULL;

-- RPC for user to opt in
CREATE OR REPLACE FUNCTION public.activate_cold_start()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  v_profile_id := public.current_profile_id();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.profiles
    SET cold_start_eligible = true,
        cold_start_activated_at = COALESCE(cold_start_activated_at, now())
    WHERE id = v_profile_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_cold_start() TO authenticated;

-- RPC returning program status (slots remaining + user progress)
CREATE OR REPLACE FUNCTION public.cold_start_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_qualified_count int;
  v_slots_remaining int;
  v_activated boolean;
  v_qualified_at timestamptz;
  v_exempt_until timestamptz;
  v_completed_count int;
BEGIN
  v_profile_id := public.current_profile_id();
  SELECT count(*) INTO v_qualified_count FROM public.profiles WHERE cold_start_qualified_at IS NOT NULL;
  v_slots_remaining := GREATEST(0, 10 - v_qualified_count);

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'slots_remaining', v_slots_remaining,
      'program_open', v_slots_remaining > 0
    );
  END IF;

  SELECT cold_start_eligible, cold_start_qualified_at, commission_exempt_until
    INTO v_activated, v_qualified_at, v_exempt_until
    FROM public.profiles WHERE id = v_profile_id;

  SELECT count(DISTINCT r.id) INTO v_completed_count
  FROM public.rides r
  WHERE r.driver_id = v_profile_id
    AND r.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.ride_requests rr
      WHERE rr.ride_id = r.id
        AND rr.status IN ('completed','picked_up','accepted','driver_arrived')
    );

  RETURN jsonb_build_object(
    'slots_remaining', v_slots_remaining,
    'program_open', v_slots_remaining > 0,
    'activated', COALESCE(v_activated, false),
    'qualified_at', v_qualified_at,
    'commission_exempt_until', v_exempt_until,
    'completed_rides', v_completed_count,
    'required_rides', 5
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cold_start_status() TO authenticated, anon;

-- Update qualification trigger: only grant bonus if user opted in AND slot available
CREATE OR REPLACE FUNCTION public.check_cold_start_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_activated boolean;
  v_qualified_at timestamptz;
  v_completed_count int;
  v_qualified_total int;
  v_wallet_id uuid;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_driver_id := NEW.driver_id;
  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cold_start_eligible, cold_start_qualified_at
    INTO v_activated, v_qualified_at
    FROM public.profiles WHERE id = v_driver_id;

  IF NOT COALESCE(v_activated, false) OR v_qualified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Slot check: only first 10
  SELECT count(*) INTO v_qualified_total FROM public.profiles WHERE cold_start_qualified_at IS NOT NULL;
  IF v_qualified_total >= 10 THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT r.id) INTO v_completed_count
  FROM public.rides r
  WHERE r.driver_id = v_driver_id
    AND r.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.ride_requests rr
      WHERE rr.ride_id = r.id
        AND rr.status IN ('completed','picked_up','accepted','driver_arrived')
    );

  IF v_completed_count < 5 THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
    SET cold_start_qualified_at = now(),
        commission_exempt_until = now() + interval '2 months',
        cold_start_bonus_paid_at = now()
    WHERE id = v_driver_id;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE profile_id = v_driver_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (profile_id) VALUES (v_driver_id) RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE public.wallets SET balance = balance + 10 WHERE id = v_wallet_id;

  INSERT INTO public.transactions (wallet_id, type, amount, description)
  VALUES (v_wallet_id, 'bonus', 10, '🎁 Bonus Cold Start — 5 dokončených jázd (prvých 10 vodičov)');

  PERFORM public.send_push_via_edge(
    v_driver_id,
    '🎁 Bonus Cold Start odomknutý!',
    'Získal si 10 € do peňaženky a 0 % komisiu na 2 mesiace. Ďakujeme!',
    jsonb_build_object('type', 'cold_start_bonus')
  );

  RETURN NEW;
END;
$$;
