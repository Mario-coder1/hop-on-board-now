import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const KEY = 'takeme_ref';

/** Uloží ?ref=KOD z odkazu a po prihlásení ho raz uplatní. */
export function useReferralCapture() {
  const { profile } = useAuth();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) localStorage.setItem(KEY, ref.toUpperCase());
  }, []);

  useEffect(() => {
    const code = localStorage.getItem(KEY);
    if (!profile?.id || !code) return;
    supabase.rpc('claim_referral', { _code: code }).then(() => localStorage.removeItem(KEY));
  }, [profile?.id]);
}
