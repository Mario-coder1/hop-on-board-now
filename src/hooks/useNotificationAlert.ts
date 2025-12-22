import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useNotificationAlert = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = () => {
    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume if suspended (required for autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create oscillator for notification sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant notification tone
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.1); // C6
      oscillator.frequency.setValueAtTime(1319, ctx.currentTime + 0.2); // E6

      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.type = 'sine';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const vibrate = () => {
    try {
      if ('vibrate' in navigator) {
        // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.log('Vibration not supported:', error);
    }
  };

  const alertNewNotification = (title: string, message: string) => {
    playNotificationSound();
    vibrate();
    
    toast({
      title: title,
      description: message,
    });
  };

  useEffect(() => {
    if (!profile?.id) return;

    // Subscribe to new notifications for this user or global ones
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            profile_id: string | null;
            is_global: boolean;
          };

          // Check if notification is for this user or is global
          if (notification.profile_id === profile.id || notification.is_global) {
            alertNewNotification(notification.title, notification.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { playNotificationSound, vibrate, alertNewNotification };
};
