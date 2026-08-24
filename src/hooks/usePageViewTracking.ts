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

const SEEN_KEY = 'tm_pv_seen';

/** Cesta sa loguje max 1× za deň na jedno zariadenie → výrazne menej DB zápisov. */
function alreadyTrackedToday(path: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const seen: string[] = parsed?.day === today && Array.isArray(parsed.paths) ? parsed.paths : [];
    if (seen.includes(path)) return true;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify({ day: today, paths: [...seen, path].slice(-100) }));
    return false;
  } catch {
    return false;
  }
}

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget/i;

/**
 * Lightweight page-view tracking:
 * - Reuses profile from AuthContext (no extra auth.getUser / profiles select per navigation).
 * - Deduplicates same path per device per day and skips bots → minimálna spotreba DB.
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

    if (BOT_RE.test(navigator.userAgent)) return;
    if (alreadyTrackedToday(path)) return;

    const payload = {
      path: path.slice(0, 200),
      session_id: getSessionId(),
      profile_id: profile?.id ?? null,
      referrer: (document.referrer || null)?.slice(0, 200) ?? null,
      user_agent: navigator.userAgent.slice(0, 120),
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

