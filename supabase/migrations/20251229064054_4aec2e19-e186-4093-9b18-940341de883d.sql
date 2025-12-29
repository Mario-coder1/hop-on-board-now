
-- Create public chat messages table
CREATE TABLE public.public_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_chat_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view messages
CREATE POLICY "Authenticated users can view messages"
ON public.public_chat_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.public_chat_messages
FOR INSERT
WITH CHECK (profile_id = current_profile_id());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.public_chat_messages
FOR DELETE
USING (profile_id = current_profile_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_chat_messages;

-- Create index for faster queries
CREATE INDEX idx_public_chat_messages_created_at ON public.public_chat_messages(created_at DESC);
