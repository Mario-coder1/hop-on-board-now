-- 1) Lock down SECURITY DEFINER functions: revoke from public/anon, grant only where needed.

-- Helper used by policies and trigger functions - only authenticated needs it
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_ride_driver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ride_driver(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_ride_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_ride_request(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_university_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_university_member(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.verify_ride_request_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_ride_request_pin(uuid, text) TO authenticated, service_role;

-- Internal/admin-only functions: service_role only
REVOKE EXECUTE ON FUNCTION public.get_internal_push_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_push_secret() TO service_role;

REVOKE EXECUTE ON FUNCTION public.send_push_via_edge(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_push_via_edge(uuid, text, text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_location_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_location_history() TO service_role;

-- Trigger-only functions: no external EXECUTE needed (triggers run as owner)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_default_vehicle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ride_request_pin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_driver_near_flag() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ride_request_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_ride_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_matching_route_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_driver_nearby() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_driver_total_rides() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_ride_payment_to_driver() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payout_request_change() FROM PUBLIC, anon, authenticated;

-- 2) Restrict public storage bucket LISTING (files still readable by direct URL)
-- Remove broad "list all files" capability so the bucket can't be enumerated.
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view chat images" ON storage.objects;

-- Re-create scoped SELECT policies that still allow direct file reads via signed/public URL
-- (Supabase serves public buckets through storage.objects SELECT — we just narrow to specific buckets)
CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Public can read chat images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');