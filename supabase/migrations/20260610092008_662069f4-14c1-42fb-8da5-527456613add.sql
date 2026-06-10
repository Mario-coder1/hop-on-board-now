ALTER TABLE public.reports DROP CONSTRAINT reports_ride_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE SET NULL;