-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can manage wallets" ON public.wallets;

-- Create a new policy that only allows service_role to manage wallets
CREATE POLICY "Service role can manage wallets"
ON public.wallets
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- The "Users can view own wallet" policy already exists and is correct