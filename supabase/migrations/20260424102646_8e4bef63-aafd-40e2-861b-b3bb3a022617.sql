-- Simplify: remove the auth.role check (service_role context in edge functions doesn't always set auth.role properly).
-- Security is enforced via GRANT — only service_role can EXECUTE this function.
CREATE OR REPLACE FUNCTION public.get_internal_push_secret()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT value FROM private.app_config WHERE key = 'internal_push_secret' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_internal_push_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_push_secret() TO service_role;