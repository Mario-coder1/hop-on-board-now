-- Applied using the Cloud data tool; retained to reproduce the named schedule.
-- lovable-cron-fallback-reviewed: No enabled delayed workflow provider; 288 runs/day preserves a maximum five-minute delay.
SELECT cron.schedule('ride-departure-reminders', '*/5 * * * *', $$SELECT public.send_ride_departure_reminders();$$);