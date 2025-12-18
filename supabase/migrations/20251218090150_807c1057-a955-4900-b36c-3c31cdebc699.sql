-- Add 'driver_arrived' to request_status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'driver_arrived' AFTER 'accepted';