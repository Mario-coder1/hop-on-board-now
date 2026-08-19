CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id <> blocked_user_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
ON public.blocked_users FOR SELECT TO authenticated
USING (blocker_id = public.current_profile_id());

CREATE POLICY "Users can create their own blocks"
ON public.blocked_users FOR INSERT TO authenticated
WITH CHECK (blocker_id = public.current_profile_id());

CREATE POLICY "Users can remove their own blocks"
ON public.blocked_users FOR DELETE TO authenticated
USING (blocker_id = public.current_profile_id());

CREATE POLICY "Admins can view all blocks"
ON public.blocked_users FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_user_id);