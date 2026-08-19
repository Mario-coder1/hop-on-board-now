DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

CREATE POLICY "Chat images upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = public.current_profile_id()::text
);

CREATE POLICY "Chat images delete own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (
    (storage.foldername(name))[1] = public.current_profile_id()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);