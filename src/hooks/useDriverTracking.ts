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

const TRACKING_STORAGE_KEY = 'takeme_location_tracking_active';

// Module-level singleton so tracking persists across component remounts within the session
let activeWatchId: number | null = null;
let activeProfileId: string | null = null;

let lastHistoryWriteAt = 0;
const HISTORY_INTERVAL_MS = 20000; // write to history at most every 20s

const startWatch = (profileId: string): number => {
  return navigator.geolocation.watchPosition(
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

      // Persist to history (throttled) for dispute resolution
      const now = Date.now();
      if (now - lastHistoryWriteAt >= HISTORY_INTERVAL_MS) {
        lastHistoryWriteAt = now;
        const { error: histErr } = await supabase
          .from('driver_location_history')
          .insert({
            profile_id: profileId,
            lat: latitude,
            lng: longitude,
            heading,
            speed,
          });
        if (histErr) console.error('Error writing location history:', histErr);
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
};


export const useLocationBroadcast = (profileId: string | null) => {
  const [isTracking, setIsTracking] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(TRACKING_STORAGE_KEY) === 'true';
  });

  // Auto-resume tracking on mount if it was active before navigation
  useEffect(() => {
    if (!profileId || !navigator.geolocation) return;

    const wasActive = localStorage.getItem(TRACKING_STORAGE_KEY) === 'true';
    if (!wasActive) return;

    // Already tracking for this profile — just sync UI state
    if (activeWatchId !== null && activeProfileId === profileId) {
      setIsTracking(true);
      return;
    }

    // Clear stale watch from a previous profile
    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId);
      activeWatchId = null;
    }

    activeWatchId = startWatch(profileId);
    activeProfileId = profileId;
    setIsTracking(true);
  }, [profileId]);

  const startTracking = useCallback(async () => {
    if (!profileId || !navigator.geolocation) {
      console.error('Geolocation not available or no profile ID');
      return;
    }

    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId);
    }

    activeWatchId = startWatch(profileId);
    activeProfileId = profileId;
    localStorage.setItem(TRACKING_STORAGE_KEY, 'true');
    setIsTracking(true);
  }, [profileId]);

  const stopTracking = useCallback(() => {
    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId);
      activeWatchId = null;
      activeProfileId = null;
    }
    localStorage.removeItem(TRACKING_STORAGE_KEY);
    setIsTracking(false);
  }, []);

  return { isTracking, startTracking, stopTracking };
};
