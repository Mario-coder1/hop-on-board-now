-- Remove the broad policy that exposes all driver data to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view ride drivers" ON public.profiles;

-- The public_profiles view (without phone/license_plate) should be used for browsing rides
-- Full profiles with sensitive data are only accessible via:
-- 1. "Users can view own profile" - own profile
-- 2. "Users can view confirmed ride participant profiles" - confirmed rides only
-- 3. "Admins can view all profiles" - admin access