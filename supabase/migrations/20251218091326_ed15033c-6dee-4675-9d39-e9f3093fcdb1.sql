-- Create table for push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = push_subscriptions.profile_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = push_subscriptions.profile_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = push_subscriptions.profile_id AND profiles.user_id = auth.uid()
));

-- Service role can read all subscriptions (for edge function)
CREATE POLICY "Service role can read all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.role() = 'service_role');

-- Enable realtime for push_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;