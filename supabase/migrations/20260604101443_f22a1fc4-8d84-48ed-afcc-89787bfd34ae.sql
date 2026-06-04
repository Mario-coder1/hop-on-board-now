
ALTER TABLE public.reports DROP CONSTRAINT reports_reporter_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT reports_reported_user_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ratings DROP CONSTRAINT ratings_rater_id_fkey;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ratings DROP CONSTRAINT ratings_rated_user_id_fkey;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_rated_user_id_fkey FOREIGN KEY (rated_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.platform_settings DROP CONSTRAINT platform_settings_updated_by_fkey;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.rides DROP CONSTRAINT rides_cancelled_by_fkey;
ALTER TABLE public.rides ADD CONSTRAINT rides_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
