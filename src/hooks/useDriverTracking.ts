import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DriverLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

const broadcastTopic = (profileId: string) => `driver-loc:${profileId}`;

export const useDriverTracking = (driverProfileId: string | null) => {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverProfileId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('user_locations')
        .select('lat, lng, heading, speed, updated_at')
        .eq('profile_id', driverProfileId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else if (data) {
        setLocation({
          lat: Number(data.lat),
          lng: Number(data.lng),
          heading: data.heading ? Number(data.heading) : null,
          speed: data.speed ? Number(data.speed) : null,
          updated_at: data.updated_at,
        });
      }
      setIsLoading(false);
    };

    fetchInitialLocation();

    // Primary: ephemeral Realtime Broadcast channel (no DB write per tick)
    const bcast = supabase
      .channel(broadcastTopic(driverProfileId), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'loc' }, (msg) => {
        const p = msg.payload as any;
        if (!p) return;
        setLocation({
          lat: Number(p.lat),
          lng: Number(p.lng),
          heading: p.heading != null ? Number(p.heading) : null,
          speed: p.speed != null ? Number(p.speed) : null,
          updated_at: p.updated_at ?? new Date().toISOString(),
        });
      })
      .subscribe();

    // Fallback: DB row changes (rare, for recovery / initial persistence)
    const dbch = supabase
      .channel(`driver-location-${driverProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
          filter: `profile_id=eq.${driverProfileId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            setLocation((prev) => {
              const next = {
                lat: Number(newData.lat),
                lng: Number(newData.lng),
                heading: newData.heading ? Number(newData.heading) : null,
                speed: newData.speed ? Number(newData.speed) : null,
                updated_at: newData.updated_at,
              };
              // Prefer newer timestamp
              if (prev && new Date(prev.updated_at).getTime() >= new Date(next.updated_at).getTime()) {
                return prev;
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(bcast);
      supabase.removeChannel(dbch);
    };
  }, [driverProfileId]);

  return { location, isLoading, error };
};

const TRACKING_STORAGE_KEY = 'takeme_location_tracking_active';

// Module-level singletons so tracking persists across component remounts
let activeWatchId: number | null = null;
let activeProfileId: string | null = null;
let activeBroadcastChannel: ReturnType<typeof supabase.channel> | null = null;

// Throttling state
let lastBroadcastAt = 0;
let lastDbUpsertAt = 0;
let lastHistoryWriteAt = 0;
let lastSentLat: number | null = null;
let lastSentLng: number | null = null;

const MIN_MOVE_METERS = 15;              // ignore jitter under 15 m
const MIN_INTERVAL_MOVING_MS = 2000;     // when moving: max 1 update / 2 s
const MIN_INTERVAL_IDLE_MS = 30000;      // when stationary: 1 update / 30 s (heartbeat)
const DB_UPSERT_INTERVAL_MS = 15000;     // persist to DB at most every 15 s
const HISTORY_INTERVAL_MS = 20000;       // history sample every 20 s

// Haversine distance in meters
const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const ensureBroadcastChannel = (profileId: string) => {
  if (activeBroadcastChannel && activeProfileId === profileId) return activeBroadcastChannel;
  if (activeBroadcastChannel) {
    supabase.removeChannel(activeBroadcastChannel);
    activeBroadcastChannel = null;
  }
  activeBroadcastChannel = supabase.channel(broadcastTopic(profileId), {
    config: { broadcast: { self: false, ack: false } },
  });
  activeBroadcastChannel.subscribe();
  return activeBroadcastChannel;
};

const startWatch = (profileId: string): number => {
  // Reset throttle state for new session
  lastBroadcastAt = 0;
  lastDbUpsertAt = 0;
  lastHistoryWriteAt = 0;
  lastSentLat = null;
  lastSentLng = null;

  const channel = ensureBroadcastChannel(profileId);

  return navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, heading, speed } = position.coords;
      const now = Date.now();

      const movedM =
        lastSentLat != null && lastSentLng != null
          ? distanceMeters(lastSentLat, lastSentLng, latitude, longitude)
          : Infinity;

      const isMoving = (speed != null && speed > 0.5) || movedM >= MIN_MOVE_METERS;
      const minInterval = isMoving ? MIN_INTERVAL_MOVING_MS : MIN_INTERVAL_IDLE_MS;
      const elapsed = now - lastBroadcastAt;

      // Skip if not enough time AND not enough movement
      if (elapsed < minInterval && movedM < MIN_MOVE_METERS) {
        return;
      }

      lastBroadcastAt = now;
      lastSentLat = latitude;
      lastSentLng = longitude;

      const updatedAt = new Date(now).toISOString();
      const payload = {
        lat: latitude,
        lng: longitude,
        heading,
        speed,
        updated_at: updatedAt,
      };

      // 1. Fast path: ephemeral Realtime Broadcast (WebSocket, no DB write)
      try {
        await channel.send({ type: 'broadcast', event: 'loc', payload });
      } catch (e) {
        console.error('broadcast send error:', e);
      }

      // 2. Slow path: throttled DB upsert for persistence + late joiners
      if (now - lastDbUpsertAt >= DB_UPSERT_INTERVAL_MS) {
        lastDbUpsertAt = now;
        const { error } = await supabase
          .from('user_locations')
          .upsert(
            {
              profile_id: profileId,
              lat: latitude,
              lng: longitude,
              heading,
              speed,
              updated_at: updatedAt,
            },
            { onConflict: 'profile_id' }
          );
        if (error) console.error('Error upserting location:', error);
      }

      // 3. History (for disputes)
      if (now - lastHistoryWriteAt >= HISTORY_INTERVAL_MS) {
        lastHistoryWriteAt = now;
        const { error: histErr } = await supabase
          .from('driver_location_history')
          .insert({ profile_id: profileId, lat: latitude, lng: longitude, heading, speed });
        if (histErr) console.error('Error writing location history:', histErr);
      }
    },
    (error) => {
      console.error('Geolocation error:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

const stopWatch = () => {
  if (activeWatchId !== null) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
  if (activeBroadcastChannel) {
    supabase.removeChannel(activeBroadcastChannel);
    activeBroadcastChannel = null;
  }
  activeProfileId = null;
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

    if (activeWatchId !== null && activeProfileId === profileId) {
      setIsTracking(true);
      return;
    }

    if (activeWatchId !== null) stopWatch();

    activeWatchId = startWatch(profileId);
    activeProfileId = profileId;
    setIsTracking(true);
  }, [profileId]);

  // Auto-start when driver has active ride
  useEffect(() => {
    if (!profileId || !navigator.geolocation) return;
    let cancelled = false;

    const ensureTrackingForActiveRide = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', profileId)
        .in('status', ['active', 'in_progress'])
        .limit(1);
      if (cancelled || error) return;
      const hasActive = (data?.length ?? 0) > 0;
      if (hasActive && (activeWatchId === null || activeProfileId !== profileId)) {
        if (activeWatchId !== null) stopWatch();
        activeWatchId = startWatch(profileId);
        activeProfileId = profileId;
        localStorage.setItem(TRACKING_STORAGE_KEY, 'true');
        setIsTracking(true);
      }
    };

    ensureTrackingForActiveRide();

    const channel = supabase
      .channel(`auto-track-${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `driver_id=eq.${profileId}` },
        () => ensureTrackingForActiveRide()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const startTracking = useCallback(async () => {
    if (!profileId || !navigator.geolocation) return;
    if (activeWatchId !== null) stopWatch();
    activeWatchId = startWatch(profileId);
    activeProfileId = profileId;
    localStorage.setItem(TRACKING_STORAGE_KEY, 'true');
    setIsTracking(true);
  }, [profileId]);

  const stopTracking = useCallback(() => {
    stopWatch();
    localStorage.removeItem(TRACKING_STORAGE_KEY);
    setIsTracking(false);
  }, []);

  return { isTracking, startTracking, stopTracking };
};
