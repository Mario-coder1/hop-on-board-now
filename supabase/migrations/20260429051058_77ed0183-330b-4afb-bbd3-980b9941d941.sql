
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS driver_near_notified_at timestamptz;

-- Trigger: when driver location updates, notify nearby passengers (~500m)
CREATE OR REPLACE FUNCTION public.notify_driver_nearby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  dist_m double precision;
  v_driver_name text;
BEGIN
  -- Only consider when coords actually changed
  IF TG_OP = 'UPDATE' AND NEW.lat = OLD.lat AND NEW.lng = OLD.lng THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = NEW.profile_id;
  v_driver_name := COALESCE(v_driver_name, 'Vodič');

  FOR r IN
    SELECT rr.id, rr.passenger_id, rr.pickup_lat, rr.pickup_lng, rr.ride_id
    FROM public.ride_requests rr
    JOIN public.rides ride ON ride.id = rr.ride_id
    WHERE ride.driver_id = NEW.profile_id
      AND rr.status = 'accepted'
      AND rr.driver_near_notified_at IS NULL
      AND ride.status IN ('active', 'in_progress')
  LOOP
    -- Haversine in meters
    dist_m := 6371000 * 2 * asin(
      sqrt(
        sin(radians((r.pickup_lat - NEW.lat) / 2))^2 +
        cos(radians(NEW.lat)) * cos(radians(r.pickup_lat)) *
        sin(radians((r.pickup_lng - NEW.lng) / 2))^2
      )
    );

    IF dist_m <= 500 THEN
      UPDATE public.ride_requests
        SET driver_near_notified_at = now()
        WHERE id = r.id AND driver_near_notified_at IS NULL;

      PERFORM public.send_push_via_edge(
        r.passenger_id,
        '📍 Vodič je už blízko!',
        v_driver_name || ' je do 500 m od miesta vyzdvihnutia. Priprav sa.',
        jsonb_build_object('rideId', r.ride_id, 'requestId', r.id, 'type', 'driver_nearby')
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_driver_nearby ON public.user_locations;
CREATE TRIGGER trg_notify_driver_nearby
AFTER INSERT OR UPDATE ON public.user_locations
FOR EACH ROW EXECUTE FUNCTION public.notify_driver_nearby();

-- Reset notification flag when status changes back to pending or new accept
CREATE OR REPLACE FUNCTION public.reset_driver_near_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    NEW.driver_near_notified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_driver_near_flag ON public.ride_requests;
CREATE TRIGGER trg_reset_driver_near_flag
BEFORE UPDATE ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.reset_driver_near_flag();
