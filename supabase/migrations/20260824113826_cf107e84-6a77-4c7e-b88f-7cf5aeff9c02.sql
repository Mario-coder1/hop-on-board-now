DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;

DROP POLICY IF EXISTS "Public can read chat images" ON storage.objects;
CREATE POLICY "Signed-in users can read chat images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Insert own page views"
ON public.page_views FOR INSERT TO anon, authenticated
WITH CHECK (profile_id IS NULL OR profile_id = public.current_profile_id());