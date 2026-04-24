import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// VAPID public key - must match the one in edge function (VAPID_PRIVATE_KEY secret)
const VAPID_PUBLIC_KEY = 'BMXQaCFjd8lhW3dxZFjsSGQn0e5_lf5vucIG1mFqNbqpIDTvXsk2-Ewhj5JW9YuwY6wLwSJF6OTRVWJqSnTSeog';

type PushUnsupportedReason = 'browser_not_supported' | 'ios_install_required' | null;
export type PushSubscriptionError =
  | 'not_supported'
  | 'ios_install_required'
  | 'permission_denied'
  | 'service_worker_error'
  | 'subscription_error'
  | 'database_error'
  | null;

export type PushSubscribeResult =
  | { success: true }
  | { success: false; error: Exclude<PushSubscriptionError, null> };

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalonePWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { profile } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState<PushUnsupportedReason>(null);
  const [lastError, setLastError] = useState<PushSubscriptionError>(null);

  const checkExistingSubscription = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const pm = (registration as any).pushManager;
      if (!pm) {
        console.warn('[Push] pushManager not available');
        return;
      }
      const subscription = await pm.getSubscription();

      if (subscription) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('endpoint', subscription.endpoint)
          .single();

        setIsSubscribed(!!data);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
    }
  }, [profile?.id]);

  useEffect(() => {
    const browserSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const requiresStandalonePWA = browserSupported && isIOSDevice() && !isStandalonePWA();

    setIsSupported(browserSupported && !requiresStandalonePWA);
    setUnsupportedReason(
      !browserSupported ? 'browser_not_supported' : requiresStandalonePWA ? 'ios_install_required' : null
    );

    if (browserSupported) {
      setPermission(Notification.permission);
      if (profile?.id && !requiresStandalonePWA) {
        checkExistingSubscription();
      }
    }
  }, [profile?.id, checkExistingSubscription]);

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    await navigator.serviceWorker.ready;
    console.log('[Push] Service worker registered');

    return registration;
  };

  const subscribe = useCallback(async (): Promise<PushSubscribeResult> => {
    setLastError(null);

    if (!profile?.id) {
      setLastError('not_supported');
      return { success: false, error: 'not_supported' };
    }

    if (!isSupported) {
      const error = unsupportedReason === 'ios_install_required' ? 'ios_install_required' : 'not_supported';
      setLastError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    try {
      let permissionResult: NotificationPermission = Notification.permission;

      if (permissionResult !== 'granted') {
        permissionResult = await Notification.requestPermission();
      }

      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setLastError('permission_denied');
        console.log('[Push] Permission denied:', permissionResult);
        return { success: false, error: 'permission_denied' };
      }

      const registration = await registerServiceWorker();
      const pm = (registration as any).pushManager;

      if (!pm) {
        setLastError('service_worker_error');
        console.error('[Push] pushManager not available on registration');
        return { success: false, error: 'service_worker_error' };
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('[Push] Subscription created:', subscription.endpoint);

      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        setLastError('subscription_error');
        throw new Error('Missing subscription keys');
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          profile_id: profile.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }, {
          onConflict: 'profile_id,endpoint'
        });

      if (error) {
        setLastError('database_error');
        console.error('[Push] Error saving subscription:', error);
        return { success: false, error: 'database_error' };
      }

      setIsSubscribed(true);
      setLastError(null);
      console.log('[Push] Successfully subscribed');
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

      let derivedError: Exclude<PushSubscriptionError, null> = 'subscription_error';
      if (message.includes('standalone') || message.includes('add to home screen')) {
        derivedError = 'ios_install_required';
      } else if (message.includes('service worker') || message.includes('pushmanager')) {
        derivedError = 'service_worker_error';
      } else if (error instanceof DOMException && error.name === 'NotAllowedError') {
        derivedError = 'permission_denied';
      }

      setLastError(derivedError);
      console.error('[Push] Error subscribing:', error);
      return { success: false, error: derivedError };
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, isSupported, unsupportedReason]);

  const unsubscribe = useCallback(async () => {
    if (!profile?.id) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const pm = (registration as any).pushManager;
      const subscription = pm ? await pm.getSubscription() : null;

      if (subscription) {
        await subscription.unsubscribe();

        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('profile_id', profile.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      setLastError(null);
      console.log('[Push] Successfully unsubscribed');
      return true;

    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    unsupportedReason,
    lastError,
    subscribe,
    unsubscribe
  };
}

// Helper function to send push notification via edge function
export async function sendPushNotification(
  profileId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        profile_id: profileId,
        title,
        body,
        data
      }
    });

    if (error) {
      console.error('[Push] Error sending notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Push] Error:', error);
    return false;
  }
}
