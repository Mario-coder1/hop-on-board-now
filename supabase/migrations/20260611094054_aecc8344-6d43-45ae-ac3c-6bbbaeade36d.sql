
-- 1) Add cold start program columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cold_start_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cold_start_qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_exempt_until timestamptz,
  ADD COLUMN IF NOT EXISTS cold_start_bonus_paid_at timestamptz;

-- 2) On new profile: mark as cold-start eligible if fewer than 10 slots taken
CREATE OR REPLACE FUNCTION public.assign_cold_start_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles WHERE cold_start_eligible = true;
  IF v_count < 10 THEN
    NEW.cold_start_eligible := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_cold_start_eligibility ON public.profiles;
CREATE TRIGGER trg_assign_cold_start_eligibility
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_cold_start_eligibility();

-- Backfill: first 10 existing profiles (by created_at) get eligibility
WITH first_ten AS (
  SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 10
)
UPDATE public.profiles p
SET cold_start_eligible = true
FROM first_ten
WHERE p.id = first_ten.id
  AND p.cold_start_eligible = false;

-- 3) Qualify drivers after 5 completed rides with passengers
CREATE OR REPLACE FUNCTION public.check_cold_start_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_eligible boolean;
  v_qualified_at timestamptz;
  v_completed_count int;
  v_wallet_id uuid;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.rides WHERE id = NEW.id;
  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cold_start_eligible, cold_start_qualified_at
    INTO v_eligible, v_qualified_at
    FROM public.profiles WHERE id = v_driver_id;

  IF NOT COALESCE(v_eligible, false) OR v_qualified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Count completed rides that had at least one real passenger
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

  -- Qualify: set qualified_at, commission exemption 2 months, pay 10€ bonus
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
    'Získal si 10 € do peňaženky a 0 % komisiu na 2 mesiace. Ďakujeme za prvé jazdy!',
    jsonb_build_object('type', 'cold_start_bonus')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_cold_start_qualification ON public.rides;
CREATE TRIGGER trg_check_cold_start_qualification
AFTER UPDATE OF status ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.check_cold_start_qualification();

-- 4) Update payout function to apply 0% commission during exemption
CREATE OR REPLACE FUNCTION public.release_ride_payment_to_driver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_commission_pct numeric;
  v_stripe_pct numeric;
  v_stripe_fixed_cents numeric;
  v_stripe_fee numeric;
  v_net numeric;
  v_base numeric;
  v_commission numeric;
  v_payout numeric;
  v_wallet_id uuid;
  v_exempt_until timestamptz;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status <> 'paid' OR NEW.payout_released_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.amount_paid IS NULL OR NEW.amount_paid <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.rides WHERE id = NEW.ride_id;
  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT commission_exempt_until INTO v_exempt_until
    FROM public.profiles WHERE id = v_driver_id;

  SELECT value INTO v_commission_pct FROM public.platform_settings WHERE key = 'ride_commission_percent';
  v_commission_pct := COALESCE(v_commission_pct, 10);

  -- Cold Start: 0% commission during exemption window
  IF v_exempt_until IS NOT NULL AND v_exempt_until > now() THEN
    v_commission_pct := 0;
  END IF;

  SELECT value INTO v_stripe_pct FROM public.platform_settings WHERE key = 'stripe_fee_percent';
  v_stripe_pct := COALESCE(v_stripe_pct, 1.5);
  SELECT value INTO v_stripe_fixed_cents FROM public.platform_settings WHERE key = 'stripe_fee_fixed_cents';
  v_stripe_fixed_cents := COALESCE(v_stripe_fixed_cents, 25);

  v_stripe_fee := ROUND(NEW.amount_paid * v_stripe_pct / 100.0 + v_stripe_fixed_cents / 100.0, 2);
  v_net := ROUND(NEW.amount_paid - v_stripe_fee, 2);
  v_base := ROUND(v_net / (1 + v_commission_pct / 100.0), 2);
  v_commission := ROUND(v_net - v_base, 2);
  v_payout := v_base + v_commission; -- when commission is 0, payout = net; otherwise base only
  IF v_commission_pct > 0 THEN
    v_payout := v_base;
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE profile_id = v_driver_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (profile_id) VALUES (v_driver_id) RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE public.wallets SET balance = balance + v_payout WHERE id = v_wallet_id;

  INSERT INTO public.transactions (wallet_id, type, amount, fee, ride_id, description)
  VALUES (v_wallet_id, 'driver_payout', v_payout,
          CASE WHEN v_commission_pct > 0 THEN v_commission + v_stripe_fee ELSE v_stripe_fee END,
          NEW.ride_id,
          CASE
            WHEN v_commission_pct = 0 THEN 'Výplata za jazdu (Cold Start: 0 % komisia)'
            ELSE 'Výplata za jazdu (platforma ' || v_commission_pct || ' % + Stripe ' || v_stripe_fee || ' € pripočítané k cene pasažiera)'
          END);

  UPDATE public.ride_requests
    SET commission_amount = CASE WHEN v_commission_pct > 0 THEN v_commission ELSE 0 END,
        driver_payout_amount = v_payout,
        payout_released_at = now()
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
