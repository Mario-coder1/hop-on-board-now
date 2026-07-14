-- Validate payout amount against wallet balance
CREATE OR REPLACE FUNCTION public.validate_payout_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric;
BEGIN
  SELECT (balance - COALESCE(pending_payout_amount, 0))
    INTO v_available
    FROM public.wallets
    WHERE profile_id = NEW.driver_id;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF NEW.amount > v_available THEN
    RAISE EXCEPTION 'amount_exceeds_available_balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payout_amount_trg ON public.payout_requests;
CREATE TRIGGER validate_payout_amount_trg
  BEFORE INSERT ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payout_amount();