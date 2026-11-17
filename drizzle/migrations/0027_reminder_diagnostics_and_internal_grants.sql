GRANT EXECUTE ON FUNCTION public.ride_departure_reminder_due(text,timestamptz,timestamptz) TO anon;
REVOKE ALL ON TABLE public.ride_departure_reminders FROM anon, authenticated;
GRANT ALL ON TABLE public.ride_departure_reminders TO service_role;