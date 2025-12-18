-- Remove overly permissive policies that weren't caught
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view locations" ON public.user_locations;
DROP POLICY IF EXISTS "Anyone can view active rides" ON public.rides;
DROP POLICY IF EXISTS "Drivers can create rides" ON public.rides;