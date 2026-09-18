-- Nový model: cestujúci platí online len rezervačný poplatok TakeMe,
-- cenu jazdy platí vodičovi v hotovosti. Žiadne výplaty vodičom z platformy.
CREATE OR REPLACE FUNCTION public.release_ride_payment_to_driver()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Anti-fraud (VOP 2.10): poplatok patrí platforme len ak bol overený PIN
  IF NEW.pin_verified_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Celá online uhradená suma je rezervačný poplatok platformy.
  -- Vodič dostáva cenu jazdy v hotovosti, platforma mu nič nevypláca.
  UPDATE public.ride_requests
    SET commission_amount = NEW.amount_paid,
        driver_payout_amount = 0,
        payout_released_at = now()
    WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;