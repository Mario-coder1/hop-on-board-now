-- Enable realtime for ride_requests table
ALTER TABLE public.ride_requests REPLICA IDENTITY FULL;

-- Add to realtime publication (ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'ride_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
  END IF;
END $$;