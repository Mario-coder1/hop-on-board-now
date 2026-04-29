-- ============================================================
-- RECURRING RIDES (templates) + ROUTE ALERTS
-- ============================================================

-- 1) ride_templates: vodičova šablóna pravidelnej jazdy
CREATE TABLE public.ride_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  origin_address text NOT NULL,
  origin_lat numeric NOT NULL,
  origin_lng numeric NOT NULL,
  destination_address text NOT NULL,
  destination_lat numeric NOT NULL,
  destination_lng numeric NOT NULL,
  departure_time time NOT NULL,                -- napr. 07:00
  weekdays smallint[] NOT NULL,                -- 0=Ne ... 6=So (ISO: použijeme JS getDay 0-6)
  available_seats integer NOT NULL DEFAULT 3,
  price_per_seat numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_generated_date date,                    -- posledný dátum, na ktorý sme vygenerovali jazdu
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_templates_driver ON public.ride_templates(driver_id);
CREATE INDEX idx_ride_templates_active ON public.ride_templates(active) WHERE active = true;

-- updated_at trigger
CREATE TRIGGER trg_ride_templates_updated_at
  BEFORE UPDATE ON public.ride_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ride_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage own templates"
  ON public.ride_templates
  FOR ALL
  USING (driver_id = current_profile_id())
  WITH CHECK (driver_id = current_profile_id());

CREATE POLICY "Service role can manage all templates"
  ON public.ride_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Link rides -> template (nullable, nepovinné)
ALTER TABLE public.rides ADD COLUMN template_id uuid;
CREATE INDEX idx_rides_template ON public.rides(template_id) WHERE template_id IS NOT NULL;

-- 2) route_alerts: pasažierove uložené trasy na notifikácie
CREATE TABLE public.route_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL,
  origin_text text NOT NULL,                   -- voľný text, matchujeme cez ILIKE
  destination_text text NOT NULL,
  max_price numeric,                           -- voliteľné
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_alerts_passenger ON public.route_alerts(passenger_id);
CREATE INDEX idx_route_alerts_active ON public.route_alerts(active) WHERE active = true;

CREATE TRIGGER trg_route_alerts_updated_at
  BEFORE UPDATE ON public.route_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.route_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own route alerts"
  ON public.route_alerts
  FOR ALL
  USING (passenger_id = current_profile_id())
  WITH CHECK (passenger_id = current_profile_id());

-- 3) Funkcia: pri vložení novej jazdy notifikuj relevantné alerty
CREATE OR REPLACE FUNCTION public.notify_matching_route_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_record record;
  v_driver_name text;
BEGIN
  -- Iba pre nové aktívne jazdy
  IF NEW.status NOT IN ('active', 'in_progress') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = NEW.driver_id;
  v_driver_name := COALESCE(v_driver_name, 'Vodič');

  FOR alert_record IN
    SELECT id, passenger_id, origin_text, destination_text, max_price
    FROM public.route_alerts
    WHERE active = true
      AND passenger_id <> NEW.driver_id  -- nenotifikuj vodiča o jeho vlastnej jazde
      AND lower(NEW.origin_address) LIKE '%' || lower(origin_text) || '%'
      AND lower(NEW.destination_address) LIKE '%' || lower(destination_text) || '%'
      AND (max_price IS NULL OR NEW.price_per_seat <= max_price)
  LOOP
    PERFORM public.send_push_via_edge(
      alert_record.passenger_id,
      '🔔 Nová jazda na tvojej trase!',
      v_driver_name || ' práve vypísal jazdu ' || NEW.origin_address || ' → ' || NEW.destination_address || ' za ' || NEW.price_per_seat || ' €.',
      jsonb_build_object('rideId', NEW.id, 'type', 'route_alert', 'alertId', alert_record.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_route_alerts_on_new_ride
  AFTER INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.notify_matching_route_alerts();