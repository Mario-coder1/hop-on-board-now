import { useEffect, useRef } from 'react';
import { hasConsent } from '@/components/CookieConsentBanner';
import { supabase } from '@/integrations/supabase/client';
import { shouldRecordSearch } from '@/lib/searchMetrics';

/** Criteria stay in memory only; no addresses, GPS, names or user IDs are sent. */
export function useSearchMetrics(source: 'search' | 'passenger' | 'airport', signature: string, hasCriteria: boolean, ready: boolean, results: number) {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!shouldRecordSearch(hasConsent('analytics'), ready, hasCriteria, previous.current, signature)) return;
      try {
        let session = sessionStorage.getItem('tm_search_session');
        if (!session) {
          session = crypto.randomUUID();
          sessionStorage.setItem('tm_search_session', session);
        }
        const { error } = await supabase.rpc('record_ride_search', {
          p_session: session, p_source: source, p_results: results,
        });
        if (!error) previous.current = signature;
      } catch { /* Analytics must never interrupt searching. */ }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [source, signature, hasCriteria, ready, results]);
}