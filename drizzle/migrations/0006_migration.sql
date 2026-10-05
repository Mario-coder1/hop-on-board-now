-- lovable-cron-fallback-reviewed: driver must be asked at departure time and ride auto-cancelled after deadline; time-based, consolidated into existing cleanup job
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS confirm_asked_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_confirmed_at timestamptz;

DO $$
DECLARE v_cmd text;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'cleanup-expired-rides-hourly';
  IF v_cmd IS NOT NULL THEN
    PERFORM cron.unschedule('cleanup-expired-rides-hourly');
    PERFORM cron.schedule('cleanup-expired-rides-hourly', '*/15 * * * *', v_cmd);
  END IF;
END $$;