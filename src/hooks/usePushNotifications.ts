import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// VAPID public key - must match the one in edge function
const VAPID_PUBLIC_KEY = 'BNlR7VxH3G8jE4o8z2bF3pK5cQ9wY1nM6vS0hX4tA7iU2dL8rO9sP5jN3kW1yZ6mE8xC0bV4gF2aH7qJ5uT9oI3';

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

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      if (profile?.id) {
        checkExistingSubscription();
      }
    }
  }, [profile?.id]);

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

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    await navigator.serviceWorker.ready;
    console.log('[Push] Service worker registered');
    
    return registration;
  };

  const subscribe = useCallback(async () => {
    if (!profile?.id || !isSupported) {
      console.log('[Push] Cannot subscribe: no profile or not supported');
      return false;
    }

    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        console.log('[Push] Permission denied:', permissionResult);
        return false;
      }

      const registration = await registerServiceWorker();
      const pm = (registration as any).pushManager;
      
      if (!pm) {
        console.error('[Push] pushManager not available on registration');
        return false;
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      console.log('[Push] Subscription created:', subscription.endpoint);

      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
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
        console.error('[Push] Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      console.log('[Push] Successfully subscribed');
      return true;

    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, isSupported]);

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
