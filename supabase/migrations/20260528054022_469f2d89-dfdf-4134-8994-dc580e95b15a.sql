CREATE POLICY "Authenticated can view live driver locations for in_progress rides"
ON public.user_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = user_locations.profile_id
      AND r.status = 'in_progress'
      AND (r.university_id IS NULL OR public.is_university_member(r.university_id))
  )
);