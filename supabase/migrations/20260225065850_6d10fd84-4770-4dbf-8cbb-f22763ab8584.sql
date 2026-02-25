-- Allow users to update their own push subscriptions (needed for upsert)
CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (profile_id = current_profile_id())
WITH CHECK (profile_id = current_profile_id());