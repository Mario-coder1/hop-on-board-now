CREATE OR REPLACE FUNCTION public.register_company(_name text, _billing_email text, _ico text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p uuid:=public.current_profile_id(); e text; cid uuid; BEGIN
SELECT email INTO e FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
IF p IS NULL OR e IS NULL THEN RAISE EXCEPTION 'Najprv potvrďte svoj email'; END IF;
IF length(trim(_name))<2 OR _billing_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Vyplňte názov firmy a platný fakturačný email'; END IF;
IF (SELECT count(*) FROM public.company_members WHERE profile_id=p AND role='hr')>=5 THEN RAISE EXCEPTION 'Limit registrácií firiem'; END IF;
-- Self-registered companies stay inactive until an admin verifies and activates them
INSERT INTO public.companies(name,email_domain,billing_email,ico,active) VALUES(trim(_name),'',trim(_billing_email),nullif(trim(_ico),''),false) RETURNING id INTO cid;
INSERT INTO public.company_members(company_id,profile_id,work_email,role,joined_at) VALUES(cid,p,e,'hr',now()); RETURN cid; END $function$;