CREATE OR REPLACE FUNCTION public.admin_get_user_activity()
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT u.id, u.last_sign_in_at, u.email::text
  FROM auth.users u;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_activity() TO authenticated;