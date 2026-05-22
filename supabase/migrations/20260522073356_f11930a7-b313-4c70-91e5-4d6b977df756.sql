-- Trigger to manage wallet pending/balance based on payout_requests lifecycle
CREATE OR REPLACE FUNCTION public.handle_payout_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  SELECT id INTO v_wallet_id FROM public.wallets WHERE profile_id = COALESCE(NEW.driver_id, OLD.driver_id);
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (profile_id) VALUES (COALESCE(NEW.driver_id, OLD.driver_id))
    RETURNING id INTO v_wallet_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Reserve the requested amount as pending
    UPDATE public.wallets
      SET pending_payout_amount = pending_payout_amount + NEW.amount
      WHERE id = v_wallet_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'paid' AND OLD.status = 'pending' THEN
      UPDATE public.wallets
        SET balance = balance - NEW.amount,
            pending_payout_amount = GREATEST(0, pending_payout_amount - NEW.amount)
        WHERE id = v_wallet_id;
      INSERT INTO public.transactions (wallet_id, type, amount, description)
      VALUES (v_wallet_id, 'payout', -NEW.amount, 'Výplata na účet (admin)');
    ELSIF NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'pending' THEN
      UPDATE public.wallets
        SET pending_payout_amount = GREATEST(0, pending_payout_amount - NEW.amount)
        WHERE id = v_wallet_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_request_change ON public.payout_requests;
CREATE TRIGGER trg_payout_request_change
  AFTER INSERT OR UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_payout_request_change();