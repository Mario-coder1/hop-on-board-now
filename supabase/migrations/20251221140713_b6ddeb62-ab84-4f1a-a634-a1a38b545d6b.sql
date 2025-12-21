-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add RLS policy to allow admins to delete rides
CREATE POLICY "Admins can delete any ride" 
ON public.rides 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service role to delete rides (for cleanup function)
CREATE POLICY "Service role can delete rides"
ON public.rides
FOR DELETE
USING (auth.role() = 'service_role'::text);