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
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM private.app_config WHERE key = 'edge_function_url';
  SELECT value INTO v_secret FROM private.app_config WHERE key = 'internal_push_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING '[push] edge function URL or internal secret not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'profile_id', _profile_id,
      'title', _title,
      'body', _body,
      'data', _data
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push] error calling edge function: %', SQLERRM;
END;
$$;