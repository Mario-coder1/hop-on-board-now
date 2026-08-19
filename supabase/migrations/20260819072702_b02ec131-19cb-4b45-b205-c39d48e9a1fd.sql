CREATE TABLE public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  profile_id uuid,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  email text,
  user_agent text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_user ON public.security_events (user_id, created_at DESC);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _status text DEFAULT 'success',
  _email text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _detail text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF _event_type IS NULL OR _event_type NOT IN (
    'login', 'login_failed', 'logout', 'signup',
    'password_reset_requested', 'password_changed'
  ) THEN
    RAISE EXCEPTION 'invalid_event_type';
  END IF;

  INSERT INTO public.security_events (user_id, profile_id, event_type, status, email, user_agent, detail)
  VALUES (
    v_uid,
    public.current_profile_id(),
    _event_type,
    COALESCE(NULLIF(_status, ''), 'success'),
    LEFT(NULLIF(TRIM(_email), ''), 255),
    LEFT(NULLIF(TRIM(_user_agent), ''), 400),
    LEFT(NULLIF(TRIM(_detail), ''), 500)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_security_events(_limit int DEFAULT 200)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  event_type text,
  status text,
  email text,
  user_agent text,
  detail text,
  full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT se.id, se.created_at, se.event_type, se.status, se.email, se.user_agent, se.detail, p.full_name
  FROM public.security_events se
  LEFT JOIN public.profiles p ON p.id = se.profile_id
  ORDER BY se.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 1000);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_security_events(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_security_events(int) TO authenticated, service_role;