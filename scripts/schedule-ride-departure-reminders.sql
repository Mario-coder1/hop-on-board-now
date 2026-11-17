-- Applied using the Cloud data tool; retained to reproduce the named schedule.
-- lovable-cron-fallback-reviewed: No enabled delayed workflow provider; 1440 runs/day preserves a maximum one-minute delay for reminders 30 minutes before departure.
SELECT cron.schedule('ride-departure-reminders', '* * * * *', $$SELECT public.send_ride_departure_reminders();$$);