import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { sendPushNotification } from '@/hooks/usePushNotifications';

export const useRideNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || subscribedRef.current) return;

    subscribedRef.current = true;

    // Subscribe to ride_requests changes for this passenger
    const channel = supabase
      .channel('ride-request-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `passenger_id=eq.${profile.id}`
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          // Only notify on status changes
          if (newStatus === oldStatus) return;

          // Fetch ride details for the notification
          const { data: ride } = await supabase
            .from('rides')
            .select('origin_address, destination_address, driver:profiles!rides_driver_id_fkey(full_name)')
            .eq('id', payload.new.ride_id)
            .single();

          const driverName = ride?.driver?.full_name || 'Vodič';

          let notificationTitle = '';
          let notificationBody = '';

          if (newStatus === 'accepted') {
            notificationTitle = '🎉 Žiadosť prijatá!';
            notificationBody = `${driverName} prijal vašu žiadosť o jazdu. Môžete sledovať jeho polohu.`;
            toast({
              title: notificationTitle,
              description: notificationBody,
              duration: 8000,
            });
            playNotificationSound();
          } else if (newStatus === 'rejected') {
            notificationTitle = '😔 Žiadosť odmietnutá';
            notificationBody = `${driverName} odmietol vašu žiadosť. Skúste inú jazdu.`;
            toast({
              title: notificationTitle,
              description: notificationBody,
              variant: 'destructive',
              duration: 8000,
            });
            playNotificationSound();
          } else if (newStatus === 'driver_arrived') {
            notificationTitle = '🚗 Vodič je na mieste!';
            notificationBody = `${driverName} práve prišiel na miesto vyzdvihnutia. Príďte k autu!`;
            toast({
              title: notificationTitle,
              description: notificationBody,
              duration: 10000,
            });
            playNotificationSound();
          } else if (newStatus === 'picked_up') {
            notificationTitle = '✅ Vyzdvihnutie potvrdené';
            notificationBody = `${driverName} potvrdil vaše vyzdvihnutie. Dobrú cestu!`;
            toast({
              title: notificationTitle,
              description: notificationBody,
              duration: 5000,
            });
          } else if (newStatus === 'completed') {
            notificationTitle = '🏁 Jazda dokončená';
            notificationBody = `Vaša jazda s ${driverName} bola úspešne dokončená.`;
            toast({
              title: notificationTitle,
              description: notificationBody,
              duration: 5000,
            });
          }

          // Send push notification (works even when app is closed)
          if (notificationTitle && notificationBody) {
            sendPushNotification(
              profile.id,
              notificationTitle,
              notificationBody,
              { rideId: payload.new.ride_id, status: newStatus }
            );
          }
        }
      )
      .subscribe();

    console.log('Subscribed to ride request notifications');

    return () => {
      console.log('Unsubscribing from ride request notifications');
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [profile?.id, toast]);
};

// Simple notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound');
  }
};
