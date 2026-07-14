import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'tm_session_id';

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + '-' + Date.now();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/**
 * Lightweight page-view tracking:
 * - Reuses profile from AuthContext (no extra auth.getUser / profiles select per navigation).
 * - Deduplicates same-path navigations.
 * - Fires the insert lazily via requestIdleCallback so it never blocks render.
 */
export function usePageViewTracking() {
  const location = useLocation();
  const { profile } = useAuth();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const payload = {
      path,
      session_id: getSessionId(),
      profile_id: profile?.id ?? null,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    };

    const send = () => {
      supabase.from('page_views').insert(payload).then(() => {}, () => {});
    };

    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) ric(send, { timeout: 2000 });
    else setTimeout(send, 500);
  }, [location.pathname, profile?.id]);
}
