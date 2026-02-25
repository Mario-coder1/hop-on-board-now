import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Automatically subscribes the user to push notifications after login.
 * Only prompts once per session to avoid annoying the user.
 */
export function useAutoSubscribePush() {
  const { profile } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || !isSupported || isSubscribed || attemptedRef.current) return;

    // Don't prompt if user already denied
    if (permission === 'denied') return;

    attemptedRef.current = true;

    // Small delay to let the app settle after login
    const timer = setTimeout(() => {
      subscribe().then((success) => {
        if (success) {
          console.log('[AutoPush] Successfully auto-subscribed to push notifications');
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [profile?.id, isSupported, isSubscribed, permission, subscribe]);
}
