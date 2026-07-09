
DROP POLICY IF EXISTS "Anyone can view settings" ON public.platform_settings;

CREATE POLICY "Admins can view settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
