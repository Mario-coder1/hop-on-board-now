DROP POLICY IF EXISTS "Members can see other members of same university" ON public.university_memberships;

-- Keep member counts / existence queries possible via is_university_member() (security definer),
-- but do NOT expose other members' verified_email through the Data API.
CREATE POLICY "Users can view their own memberships only"
ON public.university_memberships
FOR SELECT
TO authenticated
USING (profile_id = public.current_profile_id());