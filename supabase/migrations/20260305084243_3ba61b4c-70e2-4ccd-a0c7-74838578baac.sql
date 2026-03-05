
CREATE OR REPLACE FUNCTION public.increment_driver_total_rides()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Only count if the ride had at least one passenger request that is not cancelled/rejected
    IF EXISTS (
      SELECT 1 FROM public.ride_requests
      WHERE ride_id = NEW.id
        AND status IN ('completed', 'picked_up', 'accepted', 'driver_arrived')
    ) THEN
      UPDATE public.profiles
      SET total_rides = COALESCE(total_rides, 0) + 1
      WHERE id = NEW.driver_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
