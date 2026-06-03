CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_meta jsonb;
  v_given text;
  v_family text;
  v_terms_version text;
  v_privacy_version text;
  v_terms_at timestamptz;
  v_privacy_at timestamptz;
BEGIN
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_full_name := NULLIF(TRIM(v_meta ->> 'full_name'), '');
  IF v_full_name IS NULL THEN
    v_full_name := NULLIF(TRIM(v_meta ->> 'name'), '');
  END IF;
  IF v_full_name IS NULL THEN
    v_given := NULLIF(TRIM(v_meta ->> 'given_name'), '');
    v_family := NULLIF(TRIM(v_meta ->> 'family_name'), '');
    IF v_given IS NOT NULL OR v_family IS NOT NULL THEN
      v_full_name := TRIM(CONCAT_WS(' ', v_given, v_family));
    END IF;
  END IF;
  IF v_full_name IS NULL THEN
    v_full_name := NULLIF(TRIM(v_meta ->> 'preferred_username'), '');
  END IF;
  IF v_full_name IS NULL AND NEW.email IS NOT NULL THEN
    v_full_name := split_part(NEW.email, '@', 1);
  END IF;
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'User';
  END IF;

  v_full_name := LEFT(v_full_name, 100);
  v_full_name := REGEXP_REPLACE(v_full_name, E'[\\x00-\\x1F\\x7F]', '', 'g');

  v_terms_version := NULLIF(TRIM(v_meta ->> 'terms_version'), '');
  v_privacy_version := NULLIF(TRIM(v_meta ->> 'privacy_version'), '');
  IF v_terms_version IS NOT NULL THEN
    v_terms_at := COALESCE((v_meta ->> 'terms_accepted_at')::timestamptz, now());
  END IF;
  IF v_privacy_version IS NOT NULL THEN
    v_privacy_at := COALESCE((v_meta ->> 'privacy_accepted_at')::timestamptz, now());
  END IF;

  INSERT INTO public.profiles (user_id, full_name, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at)
  VALUES (NEW.id, v_full_name, v_terms_version, v_terms_at, v_privacy_version, v_privacy_at);
  RETURN NEW;
END;
$function$;