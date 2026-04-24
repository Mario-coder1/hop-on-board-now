-- Create private schema for sensitive config
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all access from public
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.app_config FROM PUBLIC;
REVOKE ALL ON private.app_config FROM anon, authenticated;

-- Update the helper to read from private.app_config instead of GUC
CREATE OR REPLACE FUNCTION public.send_push_via_edge(
  _profile_id uuid,
  _title text,
  _body text,
  _data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  v_url text;
  v_service_key text;
BEGIN
  SELECT value INTO v_url FROM private.app_config WHERE key = 'edge_function_url';
  SELECT value INTO v_service_key FROM private.app_config WHERE key = 'service_role_key';

  IF v_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[push] edge function URL or service key not configured in private.app_config';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'profile_id', _profile_id,
      'title', _title,
      'body', _body,
      'data', _data
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push] error sending notification: %', SQLERRM;
END;
$$;