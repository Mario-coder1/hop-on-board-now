CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.rating := OLD.rating;
    NEW.total_rides := OLD.total_rides;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_stats ON public.profiles;
CREATE TRIGGER protect_profile_stats BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_stats();