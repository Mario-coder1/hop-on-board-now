ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'standard';
CREATE INDEX IF NOT EXISTS rides_category_idx ON public.rides(category);
COMMENT ON COLUMN public.rides.category IS 'standard = bežné jazdy; airport = len v kategórii Letiská';