-- Add ride preference columns to rides table
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS luggage_allowed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS music_allowed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ac_allowed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS food_allowed boolean DEFAULT true;

-- Add ride preference columns to ride_templates table
ALTER TABLE public.ride_templates
ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS luggage_allowed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS music_allowed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ac_allowed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS food_allowed boolean DEFAULT true;