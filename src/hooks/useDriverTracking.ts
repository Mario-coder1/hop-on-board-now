import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DriverLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

export const useDriverTracking = (driverProfileId: string | null) => {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverProfileId) {
      setIsLoading(false);
      return;
    }

    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('user_locations')
        .select('lat, lng, heading, speed, updated_at')
        .eq('profile_id', driverProfileId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching driver location:', error);
        setError(error.message);
      } else if (data) {
        setLocation({
          lat: Number(data.lat),
          lng: Number(data.lng),
          heading: data.heading ? Number(data.heading) : null,
          speed: data.speed ? Number(data.speed) : null,
          updated_at: data.updated_at
        });
      }
      setIsLoading(false);
    };

    fetchInitialLocation();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`driver-location-${driverProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
          filter: `profile_id=eq.${driverProfileId}`
        },
        (payload) => {
          console.log('Location update received:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            setLocation({
              lat: Number(newData.lat),
              lng: Number(newData.lng),
              heading: newData.heading ? Number(newData.heading) : null,
              speed: newData.speed ? Number(newData.speed) : null,
              updated_at: newData.updated_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverProfileId]);

  return { location, isLoading, error };
};

export const useLocationBroadcast = (profileId: string | null) => {
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = useCallback(async () => {
    if (!profileId || !navigator.geolocation) {
      console.error('Geolocation not available or no profile ID');
      return;
    }

    setIsTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading, speed } = position.coords;
        
        console.log('Broadcasting location:', { latitude, longitude });

        const { error } = await supabase
          .from('user_locations')
          .upsert({
            profile_id: profileId,
            lat: latitude,
            lng: longitude,
            heading: heading,
            speed: speed,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'profile_id'
          });

        if (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  }, [profileId]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return { isTracking, startTracking, stopTracking };
};
