ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY['topup'::text, 'payment'::text, 'earning'::text, 'commission'::text, 'topup_fee'::text, 'withdrawal'::text, 'driver_payout'::text, 'payout'::text, 'refund'::text]));