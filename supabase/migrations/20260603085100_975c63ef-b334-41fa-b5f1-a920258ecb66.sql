-- History of driver locations for dispute resolution
CREATE TABLE public.driver_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  ride_id uuid,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric,
  speed numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dlh_profile_time ON public.driver_location_history (profile_id, recorded_at DESC);
CREATE INDEX idx_dlh_ride ON public.driver_location_history (ride_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.driver_location_history TO authenticated;
GRANT ALL ON public.driver_location_history TO service_role;

ALTER TABLE public.driver_location_history ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own location
CREATE POLICY "Users insert own location history"
ON public.driver_location_history
FOR INSERT TO authenticated
WITH CHECK (profile_id = current_profile_id());

-- Users can view their own
CREATE POLICY "Users view own location history"
ON public.driver_location_history
FOR SELECT TO authenticated
USING (profile_id = current_profile_id());

-- Admins can view everything
CREATE POLICY "Admins view all location history"
ON public.driver_location_history
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-cleanup function: delete records older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_location_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.driver_location_history WHERE recorded_at < now() - interval '30 days';
$$;