
-- 1) Universities table
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text NOT NULL,
  city text,
  email_domain text NOT NULL UNIQUE,
  logo_url text,
  color text DEFAULT '#1e40af',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view universities"
  ON public.universities FOR SELECT
  TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage universities"
  ON public.universities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Memberships table
CREATE TABLE public.university_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  verified_email text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, university_id)
);

CREATE INDEX idx_university_memberships_profile ON public.university_memberships(profile_id);
CREATE INDEX idx_university_memberships_university ON public.university_memberships(university_id);

ALTER TABLE public.university_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own memberships"
  ON public.university_memberships FOR SELECT
  USING (profile_id = current_profile_id());

CREATE POLICY "Members can see other members of same university"
  ON public.university_memberships FOR SELECT
  USING (
    university_id IN (
      SELECT university_id FROM public.university_memberships
      WHERE profile_id = current_profile_id()
    )
  );

CREATE POLICY "Admins view all memberships"
  ON public.university_memberships FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can leave own membership"
  ON public.university_memberships FOR DELETE
  USING (profile_id = current_profile_id());

CREATE POLICY "Service role manages memberships"
  ON public.university_memberships FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3) Email verifications table (temporary OTP codes)
CREATE TABLE public.university_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_uev_profile ON public.university_email_verifications(profile_id);
CREATE INDEX idx_uev_expires ON public.university_email_verifications(expires_at);

ALTER TABLE public.university_email_verifications ENABLE ROW LEVEL SECURITY;

-- Only service_role manages verifications (no client direct access)
CREATE POLICY "Service role manages verifications"
  ON public.university_email_verifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4) Helper function: is the current user a member of given university?
CREATE OR REPLACE FUNCTION public.is_university_member(_university_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.university_memberships
    WHERE university_id = _university_id
      AND profile_id = current_profile_id()
  )
$$;

-- 5) Add university_id column to rides
ALTER TABLE public.rides
  ADD COLUMN university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL;

CREATE INDEX idx_rides_university ON public.rides(university_id) WHERE university_id IS NOT NULL;

-- 6) Update RLS on rides:
-- Drop the public "Authenticated users can view active rides" policy
-- and replace with one that hides university-restricted rides from non-members.
DROP POLICY IF EXISTS "Authenticated users can view active rides" ON public.rides;

CREATE POLICY "Authenticated users can view active public rides"
  ON public.rides FOR SELECT
  TO authenticated
  USING (
    status IN ('active', 'in_progress')
    AND university_id IS NULL
  );

CREATE POLICY "Members can view active university rides"
  ON public.rides FOR SELECT
  TO authenticated
  USING (
    status IN ('active', 'in_progress')
    AND university_id IS NOT NULL
    AND public.is_university_member(university_id)
  );

-- 7) Seed slovak universities
INSERT INTO public.universities (code, name, short_name, city, email_domain, color) VALUES
  ('uniba', 'Univerzita Komenského v Bratislave', 'UK', 'Bratislava', 'uniba.sk', '#c8102e'),
  ('stuba', 'Slovenská technická univerzita v Bratislave', 'STU', 'Bratislava', 'stuba.sk', '#003a70'),
  ('tuke',  'Technická univerzita v Košiciach', 'TUKE', 'Košice', 'tuke.sk', '#e30613'),
  ('upjs',  'Univerzita Pavla Jozefa Šafárika v Košiciach', 'UPJŠ', 'Košice', 'upjs.sk', '#0066b3'),
  ('uniza', 'Žilinská univerzita v Žiline', 'UNIZA', 'Žilina', 'uniza.sk', '#1d6f42');
