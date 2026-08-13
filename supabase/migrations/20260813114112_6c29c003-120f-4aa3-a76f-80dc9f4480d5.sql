CREATE OR REPLACE FUNCTION public.release_ride_payment_to_driver()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Anti-fraud: payout only when the pickup was verified by the passenger's PIN
  IF NEW.pin_verified_at IS NULL THEN
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
  v_payout := v_base + v_commission;
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
$function$;