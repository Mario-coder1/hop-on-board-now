DROP POLICY IF EXISTS "Members can see other members of same university" ON public.university_memberships;

CREATE POLICY "Members can see other members of same university"
ON public.university_memberships
FOR SELECT
USING (public.is_university_member(university_id));