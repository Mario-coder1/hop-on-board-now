
-- Trigger function to increment total_rides for driver when ride is completed
CREATE OR REPLACE FUNCTION public.increment_driver_total_rides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only when status changes to 'completed' (not cancelled)
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.profiles
    SET total_rides = COALESCE(total_rides, 0) + 1
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on rides table
CREATE TRIGGER on_ride_completed_increment_total_rides
AFTER UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.increment_driver_total_rides();
