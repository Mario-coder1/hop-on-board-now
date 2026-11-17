-- Execute against Cloud with: lovable supabase query -- "$(cat scripts/test-ride-departure-reminders.sql)"
-- Each division raises an error if the production timing rule is violated.
SELECT
  1 / CASE WHEN public.ride_departure_reminder_due('active','2026-11-17 08:30:00+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS exactly_30_minutes,
  1 / CASE WHEN NOT public.ride_departure_reminder_due('active','2026-11-17 08:30:01+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS not_early,
  1 / CASE WHEN public.ride_departure_reminder_due('active','2026-11-17 08:30:00+00','2026-11-17 08:04:59+00') THEN 1 ELSE 0 END AS delayed_check_allowed,
  1 / CASE WHEN NOT public.ride_departure_reminder_due('active','2026-11-17 08:00:00+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS departure_excluded,
  1 / CASE WHEN NOT public.ride_departure_reminder_due('active','2026-11-17 07:59:59+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS past_excluded,
  1 / CASE WHEN NOT public.ride_departure_reminder_due('cancelled','2026-11-17 08:30:00+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS cancelled_excluded,
  1 / CASE WHEN NOT public.ride_departure_reminder_due('completed','2026-11-17 08:30:00+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS completed_excluded,
  1 / CASE WHEN NOT public.ride_departure_reminder_due('in_progress','2026-11-17 08:30:00+00','2026-11-17 08:00:00+00') THEN 1 ELSE 0 END AS started_excluded;