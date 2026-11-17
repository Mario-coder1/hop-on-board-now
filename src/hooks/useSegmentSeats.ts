import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Point = { lat: number | null; lng: number | null };
export function useSegmentSeats(rideId: string | undefined, pickup: Point, dropoff: Point, refresh?: number) {
  const [seats, setSeats] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_ride_segment_seats', {
        _ride_id: rideId, _pickup_lat: pickup.lat || null, _pickup_lng: pickup.lng || null,
        _dropoff_lat: dropoff.lat || null, _dropoff_lng: dropoff.lng || null,
      });
      if (!cancelled) { setSeats(error ? 0 : data); setLoading(false); }
    };
    void load();
    const channel = supabase.channel(`segment-seats-${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, load)
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [rideId, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, refresh]);
  return { seats, loading };
}