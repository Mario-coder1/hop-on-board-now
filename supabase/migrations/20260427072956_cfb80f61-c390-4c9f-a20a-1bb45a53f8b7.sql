-- Vehicles table: a driver can have multiple cars
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  label text,
  car_model text NOT NULL,
  car_color text,
  license_plate text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_profile_id ON public.vehicles(profile_id);

-- Only one default vehicle per profile
CREATE UNIQUE INDEX idx_vehicles_one_default_per_profile
  ON public.vehicles(profile_id)
  WHERE is_default = true;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Owner can view their vehicles
CREATE POLICY "Users can view own vehicles"
  ON public.vehicles
  FOR SELECT
  USING (profile_id = current_profile_id());

-- Passengers can view driver vehicles for their accepted rides
CREATE POLICY "Passengers can view driver vehicles for their rides"
  ON public.vehicles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.rides r
      JOIN public.ride_requests rr ON rr.ride_id = r.id
      WHERE r.driver_id = vehicles.profile_id
        AND rr.passenger_id = current_profile_id()
        AND rr.status IN ('accepted','driver_arrived','picked_up','completed')
    )
  );

-- Owner can insert own vehicles
CREATE POLICY "Users can insert own vehicles"
  ON public.vehicles
  FOR INSERT
  WITH CHECK (profile_id = current_profile_id());

-- Owner can update own vehicles
CREATE POLICY "Users can update own vehicles"
  ON public.vehicles
  FOR UPDATE
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

-- Owner can delete own vehicles
CREATE POLICY "Users can delete own vehicles"
  ON public.vehicles
  FOR DELETE
  USING (profile_id = current_profile_id());

-- Trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to ensure only one default vehicle per profile (clear others when one is set default)
CREATE OR REPLACE FUNCTION public.ensure_single_default_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.vehicles
      SET is_default = false
      WHERE profile_id = NEW.profile_id
        AND id <> NEW.id
        AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicles_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.vehicles
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_vehicle();

-- Backfill: copy existing car info from profiles into a default vehicle
INSERT INTO public.vehicles (profile_id, car_model, car_color, license_plate, is_default, label)
SELECT id, car_model, car_color, license_plate, true, 'Hlavné auto'
FROM public.profiles
WHERE car_model IS NOT NULL AND TRIM(car_model) <> '';
