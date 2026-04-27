import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'takeme_push_optout';

/**
 * Automatically subscribes the user to push notifications after login.
 * - If permission is already granted -> subscribe silently in background.
 * - If permission is 'default' -> request permission on the first user gesture
 *   (click/touch/keydown) after login. Browser APIs require a user gesture to
 *   show the permission prompt, so we can't ask immediately on mount.
 * - User can always opt out via the toggle in Profile (which sets DISMISS_KEY).
 */
export function useAutoSubscribePush() {
  const { profile } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || !isSupported || isSubscribed || attemptedRef.current) return;
    if (permission === 'denied') return;

    // Respect explicit user opt-out (set when they manually unsubscribe).
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;

    // Case 1: Permission already granted - subscribe silently.
    if (permission === 'granted') {
      attemptedRef.current = true;
      const timer = setTimeout(() => {
        subscribe().then((result) => {
          if (result.success) {
            console.log('[AutoPush] Auto-subscribed to push notifications');
          }
        });
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Case 2: Permission is 'default' - request on first user gesture.
    const askOnFirstInteraction = async () => {
      if (attemptedRef.current) return;
      attemptedRef.current = true;

      try {
        const result = await subscribe();
        if (result.success) {
          console.log('[AutoPush] Successfully subscribed after first interaction');
          return;
        }
        console.log('[AutoPush] Subscription not granted:', result.error);
        // Remember opt-out so we don't keep re-prompting on every interaction.
        if (result.error === 'permission_denied') {
          localStorage.setItem(DISMISS_KEY, 'true');
        }
      } finally {
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener('click', askOnFirstInteraction);
      window.removeEventListener('touchstart', askOnFirstInteraction);
      window.removeEventListener('keydown', askOnFirstInteraction);
    };

    window.addEventListener('click', askOnFirstInteraction, { once: true });
    window.addEventListener('touchstart', askOnFirstInteraction, { once: true });
    window.addEventListener('keydown', askOnFirstInteraction, { once: true });

    return cleanup;
  }, [profile?.id, isSupported, isSubscribed, permission, subscribe]);
}
