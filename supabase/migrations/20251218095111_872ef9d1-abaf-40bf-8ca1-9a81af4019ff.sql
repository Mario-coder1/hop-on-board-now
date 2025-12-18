-- Create reports table for reporting drivers
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  reported_user_id uuid NOT NULL REFERENCES public.profiles(id),
  ride_id uuid REFERENCES public.rides(id),
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ratings table for ride ratings
CREATE TABLE public.ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id uuid NOT NULL REFERENCES public.ride_requests(id) UNIQUE,
  rater_id uuid NOT NULL REFERENCES public.profiles(id),
  rated_user_id uuid NOT NULL REFERENCES public.profiles(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can create reports" 
ON public.reports FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = reports.reporter_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can view own reports" 
ON public.reports FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = reports.reporter_id AND profiles.user_id = auth.uid()
));

-- RLS policies for ratings
CREATE POLICY "Users can create ratings" 
ON public.ratings FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = ratings.rater_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Anyone can view ratings" 
ON public.ratings FOR SELECT 
USING (true);

-- Function to update user's average rating
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.ratings
    WHERE rated_user_id = NEW.rated_user_id
  )
  WHERE id = NEW.rated_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update rating after new rating is inserted
CREATE TRIGGER update_rating_after_insert
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rating();