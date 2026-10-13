DROP TRIGGER IF EXISTS trg_check_cold_start_qualification ON public.rides;
REVOKE EXECUTE ON FUNCTION public.activate_cold_start() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cold_start_status() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.check_cold_start_qualification() IS 'DEPRECATED: Cold Start bonus program removed';
COMMENT ON FUNCTION public.activate_cold_start() IS 'DEPRECATED: Cold Start bonus program removed';
COMMENT ON FUNCTION public.cold_start_status() IS 'DEPRECATED: Cold Start bonus program removed';