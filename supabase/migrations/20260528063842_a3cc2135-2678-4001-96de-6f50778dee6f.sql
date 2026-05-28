-- Partnerské čerpacie stanice
CREATE TABLE public.gas_stations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text NOT NULL,
    lat numeric NOT NULL,
    lng numeric NOT NULL,
    logo_url text,
    discount_note text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gas_stations TO anon;
GRANT SELECT ON public.gas_stations TO authenticated;
GRANT ALL ON public.gas_stations TO service_role;

ALTER TABLE public.gas_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gas stations"
ON public.gas_stations
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage gas stations"
ON public.gas_stations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pridaj gas_station_id do rides (vodič môže zvoliť partnera)
ALTER TABLE public.rides ADD COLUMN gas_station_id uuid REFERENCES public.gas_stations(id);

-- Zastavenia vodiča na čerpacej stanici počas jazdy
CREATE TABLE public.ride_gas_stops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    gas_station_id uuid NOT NULL REFERENCES public.gas_stations(id) ON DELETE CASCADE,
    stopped_by uuid NOT NULL,
    stopped_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.ride_gas_stops TO authenticated;
GRANT ALL ON public.ride_gas_stops TO service_role;

ALTER TABLE public.ride_gas_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ride participants can view gas stops"
ON public.ride_gas_stops
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.rides r
    LEFT JOIN public.ride_requests rr ON rr.ride_id = r.id
    WHERE r.id = ride_gas_stops.ride_id
    AND (r.driver_id = current_profile_id() OR rr.passenger_id = current_profile_id())
));

CREATE POLICY "Drivers can create gas stops for their rides"
ON public.ride_gas_stops
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_gas_stops.ride_id
    AND r.driver_id = current_profile_id()
));

CREATE POLICY "Admins can delete gas stops"
ON public.ride_gas_stops
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));