
-- Performance indexes only. No schema/behavior changes.

-- notifications: hot path for useRideNotifications (profile feed + global feed)
CREATE INDEX IF NOT EXISTS idx_notifications_profile_created
  ON public.notifications (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_global_created
  ON public.notifications (created_at DESC) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
  ON public.notifications (profile_id) WHERE is_read = false;

-- ratings: AVG(rating) trigger + lookups
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user
  ON public.ratings (rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater
  ON public.ratings (rater_id);

-- transactions: wallet history
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created
  ON public.transactions (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ride
  ON public.transactions (ride_id);

-- payout_requests: admin + driver lists
CREATE INDEX IF NOT EXISTS idx_payout_requests_driver_created
  ON public.payout_requests (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status_created
  ON public.payout_requests (status, created_at DESC);

-- reports: admin moderation lists
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user
  ON public.reports (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter
  ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_ride
  ON public.reports (ride_id);

-- ride_gas_stops: list by ride
CREATE INDEX IF NOT EXISTS idx_ride_gas_stops_ride
  ON public.ride_gas_stops (ride_id);

-- ride_requests: passenger filtered by status (TrackRide, MyTrips)
CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger_status
  ON public.ride_requests (passenger_id, status);
-- speed up driver-side lookups joined with status
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_passenger
  ON public.ride_requests (ride_id, passenger_id);
-- payments webhook lookup by payment intent
CREATE INDEX IF NOT EXISTS idx_ride_requests_pi
  ON public.ride_requests (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- rides: active rides search (SearchRides) — status + departure already covered;
-- add covering for university filter
CREATE INDEX IF NOT EXISTS idx_rides_status_departure_public
  ON public.rides (departure_time) WHERE status IN ('active','in_progress') AND university_id IS NULL;

-- notification_reads: lookup by profile
CREATE INDEX IF NOT EXISTS idx_notification_reads_profile
  ON public.notification_reads (profile_id);

-- page_views: admin filters by profile
CREATE INDEX IF NOT EXISTS idx_page_views_profile
  ON public.page_views (profile_id) WHERE profile_id IS NOT NULL;

-- push_subscriptions: bulk lookup by profile
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile
  ON public.push_subscriptions (profile_id);

-- user_roles: has_role() lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id);

-- driver_location_history cleanup uses recorded_at
CREATE INDEX IF NOT EXISTS idx_dlh_recorded
  ON public.driver_location_history (recorded_at);

ANALYZE public.notifications;
ANALYZE public.ratings;
ANALYZE public.transactions;
ANALYZE public.payout_requests;
ANALYZE public.reports;
ANALYZE public.ride_requests;
ANALYZE public.rides;
ANALYZE public.push_subscriptions;
ANALYZE public.user_roles;
ANALYZE public.driver_location_history;
