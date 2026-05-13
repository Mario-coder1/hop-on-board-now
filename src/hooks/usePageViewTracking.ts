import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

export function usePageViewTracking() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const log = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let profileId: string | null = null;
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          profileId = data?.id ?? null;
        }

        await supabase.from('page_views').insert({
          path,
          session_id: getSessionId(),
          profile_id: profileId,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch {
        // silent
      }
    };
    log();
  }, [location.pathname]);
}
