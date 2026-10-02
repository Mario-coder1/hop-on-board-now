ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS payment_captured_at timestamptz;
UPDATE public.ride_requests SET payment_captured_at = COALESCE(paid_at, created_at)
WHERE payment_status IN ('paid','refunded','partially_refunded') AND payment_captured_at IS NULL;