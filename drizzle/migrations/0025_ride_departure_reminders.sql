CREATE TABLE public.ride_departure_reminders (
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure_time timestamptz NOT NULL,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  PRIMARY KEY (ride_id, profile_id, departure_time)
);
GRANT ALL ON public.ride_departure_reminders TO service_role;
ALTER TABLE public.ride_departure_reminders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ride_departure_reminder_due(_status text, _departure timestamptz, _now timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT coalesce(_status = 'active' AND _departure > _now AND _departure <= _now + interval '30 minutes', false);
$$;
REVOKE ALL ON FUNCTION public.ride_departure_reminder_due(text,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ride_departure_reminder_due(text,timestamptz,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.send_ride_departure_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 r record; recipient record; notification_uuid uuid; reminder_count integer := 0;
 reminder_title text := 'Blíži sa odchod jazdy'; reminder_body text; route text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(73190117) THEN RETURN 0; END IF;
 FOR r IN SELECT id, driver_id, origin_address, destination_address, departure_time
   FROM public.rides
   WHERE status = 'active' AND departure_time > now() AND departure_time <= now() + interval '30 minutes'
     AND public.ride_departure_reminder_due(status::text, departure_time, now())
   ORDER BY departure_time LIMIT 500 FOR UPDATE SKIP LOCKED
 LOOP
  route := split_part(r.origin_address, ',', 1) || ' → ' || split_part(r.destination_address, ',', 1);
  FOR recipient IN
   SELECT r.driver_id AS profile_id, '/manage-passengers/' || r.id::text AS target
   UNION
   SELECT rr.passenger_id, '/track/' || rr.id::text FROM public.ride_requests rr
    WHERE rr.ride_id = r.id AND rr.status = 'accepted'
  LOOP
   IF EXISTS (SELECT 1 FROM public.ride_departure_reminders d WHERE d.ride_id = r.id AND d.profile_id = recipient.profile_id AND d.departure_time = r.departure_time) THEN CONTINUE; END IF;
   reminder_body := route || ': odchod o ' || to_char(r.departure_time AT TIME ZONE 'Europe/Bratislava', 'HH24:MI') || '. Priprav sa na jazdu.';
   INSERT INTO public.notifications(profile_id,title,message) VALUES(recipient.profile_id,reminder_title,reminder_body) RETURNING id INTO notification_uuid;
   INSERT INTO public.ride_departure_reminders(ride_id,profile_id,departure_time,notification_id) VALUES(r.id,recipient.profile_id,r.departure_time,notification_uuid);
   PERFORM public.send_push_via_edge(recipient.profile_id,reminder_title,reminder_body,jsonb_build_object('url',recipient.target,'ride_id',r.id,'notification_id',notification_uuid));
   reminder_count := reminder_count + 1;
  END LOOP;
 END LOOP;
 RETURN reminder_count;
END;
$$;
REVOKE ALL ON FUNCTION public.send_ride_departure_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_ride_departure_reminders() TO service_role;