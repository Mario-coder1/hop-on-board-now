CREATE OR REPLACE FUNCTION public.get_internal_push_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_secret text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT value INTO v_secret FROM private.app_config WHERE key = 'internal_push_secret';
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_internal_push_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_push_secret() TO service_role;