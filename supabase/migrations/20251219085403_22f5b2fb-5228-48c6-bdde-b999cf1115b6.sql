-- Drop the policy that exposes sensitive data to ride participants
DROP POLICY IF EXISTS "Users can view confirmed ride participant profiles" ON public.profiles;

-- Create a more restrictive policy that only allows viewing own profile
-- Other users' data should be accessed via public_profiles view which already excludes sensitive fields
-- Note: public_profiles view already exists and excludes phone, license_plate fields

-- Grant select on public_profiles to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create policy to allow authenticated users to view public_profiles view data
-- The view already filters out sensitive columns (phone, license_plate)
CREATE POLICY "Authenticated users can view public profiles via view"
ON public.profiles
FOR SELECT
USING (
  -- Allow own profile (full access)
  auth.uid() = user_id
  OR
  -- Allow admins (full access)
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- For ride participants, only allow access to non-sensitive fields
  -- by checking if they're accessing through a confirmed ride relationship
  -- but this access will be handled via public_profiles view
  FALSE
);