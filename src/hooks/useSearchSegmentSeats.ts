import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { searchSegment, type SegmentSearchRide } from '@/lib/segmentSearch';

export function useSearchSegmentSeats(rides: SegmentSearchRide[], from: string, to: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const active = Boolean(from.trim() || to.trim());
  useEffect(() => {
    let cancelled = false;
    setCounts({});
    if (!active) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await Promise.all(rides.map(async ride => {
        const segment = searchSegment(ride, from, to);
        if (!segment) return [ride.id, 0] as const;
        const { data, error } = await supabase.rpc('get_ride_segment_seats', {
          _ride_id: ride.id, _pickup_lat: segment.pickup.lat, _pickup_lng: segment.pickup.lng,
          _dropoff_lat: segment.dropoff.lat, _dropoff_lng: segment.dropoff.lng,
        });
        return [ride.id, error ? 0 : Number(data ?? 0)] as const;
      }));
      if (!cancelled) { setCounts(Object.fromEntries(results)); setLoading(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [rides, from, to, active]);
  return { counts, loading, active };
}