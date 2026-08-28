CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  environment text,
  status text NOT NULL DEFAULT 'error',
  stripe_event_id text,
  stripe_session_id text,
  ride_id uuid,
  profile_id uuid,
  amount numeric,
  error_message text,
  payload jsonb,
  retry_count integer NOT NULL DEFAULT 0,
  resolved_at timestamp with time zone,
  last_retry_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX payment_events_created_at_idx ON public.payment_events (created_at DESC);
CREATE INDEX payment_events_status_idx ON public.payment_events (status);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment events"
ON public.payment_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_payment_event_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'errors_open', count(*) FILTER (WHERE status = 'error' AND resolved_at IS NULL),
    'errors_24h', count(*) FILTER (WHERE status = 'error' AND created_at >= now() - interval '24 hours'),
    'resolved_7d', count(*) FILTER (WHERE resolved_at >= now() - interval '7 days'),
    'total_7d', count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
    'pending_unpaid_requests', (SELECT count(*) FROM public.ride_requests WHERE payment_status = 'pending' AND created_at < now() - interval '1 hour')
  ) INTO v FROM public.payment_events;

  RETURN v;
END;
$$;