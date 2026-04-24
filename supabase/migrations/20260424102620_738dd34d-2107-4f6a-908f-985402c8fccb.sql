-- Update internal_push_secret to match the service role key (which the edge function reads from env)
DO $$
DECLARE
  v_service_key text;
BEGIN
  -- Read the service role key that pg_net uses (stored in vault or settings)
  -- We use current_setting to read the supabase service role key from the database settings
  BEGIN
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  -- If not available via setting, leave secret as-is (admin will need to update manually)
  IF v_service_key IS NOT NULL AND length(v_service_key) > 0 THEN
    UPDATE private.app_config
    SET value = v_service_key
    WHERE key = 'internal_push_secret';
  END IF;
END $$;