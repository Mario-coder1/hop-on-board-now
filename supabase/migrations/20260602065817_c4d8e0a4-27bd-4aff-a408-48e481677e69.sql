CREATE OR REPLACE FUNCTION public.release_ride_payment_to_driver()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_id uuid;
  v_commission_pct numeric;
  v_base numeric;
  v_commission numeric;
  v_payout numeric;
  v_wallet_id uuid;
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

  SELECT value INTO v_commission_pct FROM public.platform_settings WHERE key = 'ride_commission_percent';
  v_commission_pct := COALESCE(v_commission_pct, 10);

  -- Commission is ADDED ON TOP of the driver's price.
  -- amount_paid = base * (1 + pct/100)  =>  base = amount_paid / (1 + pct/100)
  v_base := ROUND(NEW.amount_paid / (1 + v_commission_pct / 100.0), 2);
  v_commission := ROUND(NEW.amount_paid - v_base, 2);
  v_payout := v_base;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE profile_id = v_driver_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (profile_id) VALUES (v_driver_id) RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE public.wallets SET balance = balance + v_payout WHERE id = v_wallet_id;

  INSERT INTO public.transactions (wallet_id, type, amount, fee, ride_id, description)
  VALUES (v_wallet_id, 'driver_payout', v_payout, v_commission, NEW.ride_id,
          'Výplata za jazdu (platforma ' || v_commission_pct || ' % pripočítaná k cene pasažiera)');

  UPDATE public.ride_requests
    SET commission_amount = v_commission,
        driver_payout_amount = v_payout,
        payout_released_at = now()
    WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;