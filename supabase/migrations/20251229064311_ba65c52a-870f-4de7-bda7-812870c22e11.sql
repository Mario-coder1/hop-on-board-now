
-- Add image_url column to public_chat_messages
ALTER TABLE public.public_chat_messages 
ADD COLUMN image_url TEXT;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow anyone to view chat images (public bucket)
CREATE POLICY "Anyone can view chat images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-images');

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete own chat images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-images' 
  AND auth.uid() IS NOT NULL
);
