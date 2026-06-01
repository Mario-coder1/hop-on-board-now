ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS max_detour_km numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ride_templates ADD COLUMN IF NOT EXISTS max_detour_km numeric NOT NULL DEFAULT 0;