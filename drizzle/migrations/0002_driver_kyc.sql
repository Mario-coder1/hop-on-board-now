CREATE TABLE public.driver_verifications (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text,
  status text NOT NULL DEFAULT 'not_started',
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.driver_verifications TO authenticated;
GRANT ALL ON public.driver_verifications TO service_role;
ALTER TABLE public.driver_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.driver_verifications FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_driver_verified(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.driver_verifications WHERE profile_id = _profile_id AND verified_at IS NOT NULL);
$$;