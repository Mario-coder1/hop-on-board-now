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

    // Subscribe to ride_requests changes for this PASSENGER
    const passengerChannel = supabase
      .channel('ride-request-updates-passenger')
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

          if (newStatus === oldStatus) return;

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
          } else if (newStatus === 'rejected') {
            notificationTitle = '😔 Žiadosť odmietnutá';
            notificationBody = `${driverName} odmietol vašu žiadosť. Skúste inú jazdu.`;
          } else if (newStatus === 'driver_arrived') {
            notificationTitle = '🚗 Vodič je na mieste!';
            notificationBody = `${driverName} práve prišiel na miesto vyzdvihnutia. Príďte k autu!`;
          } else if (newStatus === 'picked_up') {
            notificationTitle = '✅ Vyzdvihnutie potvrdené';
            notificationBody = `${driverName} potvrdil vaše vyzdvihnutie. Dobrú cestu!`;
          } else if (newStatus === 'completed') {
            notificationTitle = '🏁 Jazda dokončená';
            notificationBody = `Vaša jazda s ${driverName} bola úspešne dokončená.`;
          }

          if (notificationTitle && notificationBody) {
            toast({
              title: notificationTitle,
              description: notificationBody,
              duration: newStatus === 'driver_arrived' ? 10000 : 8000,
              variant: newStatus === 'rejected' ? 'destructive' : undefined,
            });
            playNotificationSound();

            // Send push notification to passenger (self) for when app is closed
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

    // Subscribe to NEW ride requests for this DRIVER
    const driverChannel = supabase
      .channel('ride-request-new-for-driver')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
        },
        async (payload) => {
          const request = payload.new as {
            id: string;
            ride_id: string;
            passenger_id: string;
            pickup_address: string;
            status: string;
          };

          // Check if this ride belongs to current user (driver)
          const { data: ride } = await supabase
            .from('rides')
            .select('id, origin_address, destination_address, driver_id')
            .eq('id', request.ride_id)
            .eq('driver_id', profile.id)
            .single();

          if (!ride) return; // Not our ride

          // Get passenger name
          const { data: passenger } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', request.passenger_id)
            .single();

          const passengerName = passenger?.full_name || 'Cestujúci';
          const notificationTitle = '🙋 Nová žiadosť o jazdu!';
          const notificationBody = `${passengerName} sa chce pripojiť k vašej jazde z ${ride.origin_address}.`;

          toast({
            title: notificationTitle,
            description: notificationBody,
            duration: 10000,
          });
          playNotificationSound();

          // Send push to driver (self)
          sendPushNotification(
            profile.id,
            notificationTitle,
            notificationBody,
            { rideId: request.ride_id, requestId: request.id, type: 'new_request' }
          );
        }
      )
      .subscribe();

    console.log('Subscribed to ride notifications (passenger + driver)');

    return () => {
      supabase.removeChannel(passengerChannel);
      supabase.removeChannel(driverChannel);
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
