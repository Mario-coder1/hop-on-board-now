import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification } from '@/hooks/usePushNotifications';

interface Destination {
  lat: number;
  lng: number;
}

// Calculate distance between two GPS points using Haversine formula
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const useAutoCompleteRide = (
  rideId: string | null,
  destination: Destination | null,
  profileId: string | null,
  isTracking: boolean
) => {
  const { toast } = useToast();
  const hasCompletedRef = useRef(false);
  const checkingRef = useRef(false);

  const completeRide = useCallback(async () => {
    if (!rideId || hasCompletedRef.current || checkingRef.current) return;
    
    checkingRef.current = true;
    hasCompletedRef.current = true;

    try {
      // Update ride status to completed
      const { error: rideError } = await supabase
        .from('rides')
        .update({ status: 'completed' })
        .eq('id', rideId);

      if (rideError) {
        console.error('Error completing ride:', rideError);
        hasCompletedRef.current = false;
        checkingRef.current = false;
        return;
      }

      // Get all picked_up passengers for this ride
      const { data: passengers, error: passengersError } = await supabase
        .from('ride_requests')
        .select('id, passenger_id')
        .eq('ride_id', rideId)
        .eq('status', 'picked_up');

      if (passengersError) {
        console.error('Error fetching passengers:', passengersError);
      }

      // Update all passenger requests to completed
      const { error: requestsError } = await supabase
        .from('ride_requests')
        .update({ status: 'completed' })
        .eq('ride_id', rideId)
        .in('status', ['accepted', 'driver_arrived', 'picked_up']);

      if (requestsError) {
        console.error('Error completing requests:', requestsError);
      }

      // Send push notifications to all passengers
      if (passengers && passengers.length > 0) {
        for (const passenger of passengers) {
          try {
            await sendPushNotification(
              passenger.passenger_id,
              '🏁 Jazda dokončená!',
              'Dorazili ste do cieľa. Ďakujeme za spolujazdu!'
            );
          } catch (err) {
            console.error('Error sending notification:', err);
          }
        }
      }

      toast({
        title: '🏁 Jazda dokončená!',
        description: 'Dorazili ste do cieľa. Všetci pasažieri boli upozornení.',
      });

      console.log('Ride auto-completed successfully');
    } catch (error) {
      console.error('Error in completeRide:', error);
      hasCompletedRef.current = false;
    } finally {
      checkingRef.current = false;
    }
  }, [rideId, toast]);

  useEffect(() => {
    if (!rideId || !destination || !profileId || !isTracking) {
      return;
    }

    // Reset completion flag when ride changes
    hasCompletedRef.current = false;

    const checkProximity = async () => {
      if (hasCompletedRef.current) return;

      // Get current driver location
      const { data: locationData, error } = await supabase
        .from('user_locations')
        .select('lat, lng')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error || !locationData) {
        return;
      }

      const distance = calculateDistance(
        Number(locationData.lat),
        Number(locationData.lng),
        destination.lat,
        destination.lng
      );

      console.log(`Distance to destination: ${distance.toFixed(1)}m`);

      // Auto-complete if within 50 meters (GPS accuracy on mobile is ±10-30m)
      if (distance <= 50 && !hasCompletedRef.current) {
        console.log('Within 50m of destination, completing ride...');
        await completeRide();
      }
    };

    // Check immediately
    checkProximity();

    // Check every 3 seconds while tracking
    const interval = setInterval(checkProximity, 3000);

    // Also subscribe to location updates for real-time checking
    const channel = supabase
      .channel(`auto-complete-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
          filter: `profile_id=eq.${profileId}`
        },
        async (payload) => {
          if (hasCompletedRef.current) return;
          
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            const distance = calculateDistance(
              Number(newData.lat),
              Number(newData.lng),
              destination.lat,
              destination.lng
            );

            console.log(`Real-time distance to destination: ${distance.toFixed(1)}m`);

            if (distance <= 50 && !hasCompletedRef.current) {
              console.log('Within 50m of destination (real-time), completing ride...');
              await completeRide();
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [rideId, destination, profileId, isTracking, completeRide]);

  return { completeRide };
};
