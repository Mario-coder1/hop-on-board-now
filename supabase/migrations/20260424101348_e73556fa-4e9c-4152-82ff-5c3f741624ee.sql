-- Helper function to call edge function via pg_net for push notifications
CREATE OR REPLACE FUNCTION public.send_push_via_edge(
  _profile_id uuid,
  _title text,
  _body text,
  _data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_service_key text;
BEGIN
  -- Read configuration set in DB (these settings are set per-project)
  v_url := current_setting('app.edge_function_url', true);
  v_service_key := current_setting('app.service_role_key', true);

  IF v_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[push] edge function URL or service key not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'profile_id', _profile_id,
      'title', _title,
      'body', _body,
      'data', _data
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push] error sending notification: %', SQLERRM;
END;
$$;

-- Trigger function: on ride_request status change, notify the relevant party
CREATE OR REPLACE FUNCTION public.notify_ride_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver_id uuid;
  v_driver_name text;
  v_passenger_name text;
  v_origin text;
  v_title text;
  v_body text;
  v_recipient uuid;
BEGIN
  -- Only trigger on actual status changes
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Look up ride + driver
  SELECT r.driver_id, r.origin_address, dp.full_name
  INTO v_driver_id, v_origin, v_driver_name
  FROM public.rides r
  JOIN public.profiles dp ON dp.id = r.driver_id
  WHERE r.id = NEW.ride_id;

  -- Look up passenger name
  SELECT full_name INTO v_passenger_name
  FROM public.profiles WHERE id = NEW.passenger_id;

  v_driver_name := COALESCE(v_driver_name, 'Vodič');
  v_passenger_name := COALESCE(v_passenger_name, 'Cestujúci');

  -- Status -> notification mapping (always notify the PASSENGER for these driver-initiated changes)
  IF NEW.status = 'accepted' THEN
    v_title := '🎉 Žiadosť prijatá!';
    v_body := v_driver_name || ' prijal vašu žiadosť o jazdu.';
    v_recipient := NEW.passenger_id;
  ELSIF NEW.status = 'rejected' THEN
    v_title := '😔 Žiadosť odmietnutá';
    v_body := v_driver_name || ' odmietol vašu žiadosť. Skúste inú jazdu.';
    v_recipient := NEW.passenger_id;
  ELSIF NEW.status = 'driver_arrived' THEN
    v_title := '🚗 Vodič je na mieste!';
    v_body := v_driver_name || ' práve prišiel na miesto vyzdvihnutia.';
    v_recipient := NEW.passenger_id;
  ELSIF NEW.status = 'picked_up' THEN
    v_title := '✅ Vyzdvihnutie potvrdené';
    v_body := v_driver_name || ' potvrdil vaše vyzdvihnutie. Dobrú cestu!';
    v_recipient := NEW.passenger_id;
  ELSIF NEW.status = 'completed' THEN
    v_title := '🏁 Jazda dokončená';
    v_body := 'Vaša jazda s ' || v_driver_name || ' bola úspešne dokončená.';
    v_recipient := NEW.passenger_id;
  ELSIF NEW.status = 'cancelled' THEN
    -- Notify the OTHER party - if passenger cancelled, notify driver; vice versa
    v_title := '❌ Jazda zrušená';
    v_body := 'Rezervácia bola zrušená.';
    -- Notify the driver here (passenger-initiated cancel handled in app)
    v_recipient := v_driver_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient IS NOT NULL AND v_title IS NOT NULL THEN
    PERFORM public.send_push_via_edge(
      v_recipient,
      v_title,
      v_body,
      jsonb_build_object('rideId', NEW.ride_id, 'requestId', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for NEW ride_request -> notify the driver
CREATE OR REPLACE FUNCTION public.notify_new_ride_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver_id uuid;
  v_origin text;
  v_passenger_name text;
BEGIN
  SELECT r.driver_id, r.origin_address
  INTO v_driver_id, v_origin
  FROM public.rides r
  WHERE r.id = NEW.ride_id;

  SELECT full_name INTO v_passenger_name
  FROM public.profiles WHERE id = NEW.passenger_id;

  v_passenger_name := COALESCE(v_passenger_name, 'Cestujúci');

  IF v_driver_id IS NOT NULL THEN
    PERFORM public.send_push_via_edge(
      v_driver_id,
      '🙋 Nová žiadosť o jazdu!',
      v_passenger_name || ' sa chce pripojiť k vašej jazde z ' || COALESCE(v_origin, 'neznámeho miesta') || '.',
      jsonb_build_object('rideId', NEW.ride_id, 'requestId', NEW.id, 'type', 'new_request')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trg_notify_ride_request_status ON public.ride_requests;
DROP TRIGGER IF EXISTS trg_notify_new_ride_request ON public.ride_requests;

-- Create triggers
CREATE TRIGGER trg_notify_new_ride_request
AFTER INSERT ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_ride_request();

CREATE TRIGGER trg_notify_ride_request_status
AFTER UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_ride_request_status();