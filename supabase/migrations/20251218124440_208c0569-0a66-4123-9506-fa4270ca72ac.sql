-- Enable realtime for ride_requests to ensure passenger/driver notifications work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ride_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
  END IF;
END $$;

-- Enable realtime for rides for status changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;
END $$;