-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('driver', 'passenger');

-- Create enum for ride status
CREATE TYPE public.ride_status AS ENUM ('active', 'in_progress', 'completed', 'cancelled');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected', 'picked_up', 'completed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  car_model TEXT,
  car_color TEXT,
  license_plate TEXT,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  selected_role user_role DEFAULT 'passenger',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create rides table (offered by drivers)
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  available_seats INTEGER NOT NULL DEFAULT 3,
  price_per_seat DECIMAL(10, 2) NOT NULL,
  status ride_status DEFAULT 'active',
  route_polyline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ride requests table
CREATE TABLE public.ride_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  status request_status DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user locations table for live tracking
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rides policies
CREATE POLICY "Anyone can view active rides" ON public.rides
  FOR SELECT USING (true);

CREATE POLICY "Drivers can create rides" ON public.rides
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Drivers can update own rides" ON public.rides
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = driver_id AND user_id = auth.uid())
  );

-- Ride requests policies
CREATE POLICY "Users can view relevant requests" ON public.ride_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = passenger_id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rides r 
      JOIN public.profiles p ON r.driver_id = p.id 
      WHERE r.id = ride_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Passengers can create requests" ON public.ride_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = passenger_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update relevant requests" ON public.ride_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = passenger_id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rides r 
      JOIN public.profiles p ON r.driver_id = p.id 
      WHERE r.id = ride_id AND p.user_id = auth.uid()
    )
  );

-- User locations policies
CREATE POLICY "Users can view locations" ON public.user_locations
  FOR SELECT USING (true);

CREATE POLICY "Users can update own location" ON public.user_locations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own location" ON public.user_locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND profiles.user_id = auth.uid())
  );

-- Enable realtime for locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'));
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();