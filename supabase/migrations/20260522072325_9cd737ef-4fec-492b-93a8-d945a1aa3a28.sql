
-- Add payment fields to ride_requests
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS driver_payout_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'eur',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_per_seat_snapshot numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_ride_requests_session ON public.ride_requests(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_payment_status ON public.ride_requests(payment_status);

-- Insert commission setting
INSERT INTO public.platform_settings (key, value, description)
VALUES ('ride_commission_percent', 10, 'Percento komisie z každej zaplatenej jazdy (0-100)')
ON CONFLICT (key) DO NOTHING;

-- Add pending payout amount to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS pending_payout_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Payout requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending',
  bank_iban text,
  note text,
  admin_note text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own payout requests"
  ON public.payout_requests FOR SELECT
  USING (driver_id = current_profile_id());

CREATE POLICY "Drivers create own payout requests"
  ON public.payout_requests FOR INSERT
  WITH CHECK (driver_id = current_profile_id());

CREATE POLICY "Admins view all payout requests"
  ON public.payout_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update payout requests"
  ON public.payout_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: release funds to driver wallet when ride completes
CREATE OR REPLACE FUNCTION public.release_ride_payment_to_driver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_commission_pct numeric;
  v_commission numeric;
  v_payout numeric;
  v_wallet_id uuid;
BEGIN
  -- Only on transition to completed, only if paid, only once
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

  v_commission := ROUND(NEW.amount_paid * v_commission_pct / 100.0, 2);
  v_payout := NEW.amount_paid - v_commission;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE profile_id = v_driver_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (profile_id) VALUES (v_driver_id) RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE public.wallets SET balance = balance + v_payout WHERE id = v_wallet_id;

  INSERT INTO public.transactions (wallet_id, type, amount, fee, ride_id, description)
  VALUES (v_wallet_id, 'driver_payout', v_payout, v_commission, NEW.ride_id,
          'Výplata za jazdu (komisia ' || v_commission_pct || ' %)');

  UPDATE public.ride_requests
    SET commission_amount = v_commission,
        driver_payout_amount = v_payout,
        payout_released_at = now()
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_ride_payment_to_driver ON public.ride_requests;
CREATE TRIGGER trg_release_ride_payment_to_driver
  AFTER UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.release_ride_payment_to_driver();
