import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GasStationMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'gas_station';
  label?: string;
  avatarUrl?: string | null;
  popup?: string;
}

/**
 * Fetches all active partner gas stations and returns them as map markers.
 * Used across all maps so drivers/passengers always see partner stations.
 */
export function useGasStations() {
  const [stations, setStations] = useState<GasStationMarker[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('gas_stations')
        .select('id, name, address, lat, lng, logo_url, discount_note, active')
        .eq('active', true);
      if (error || cancelled || !data) return;
      setStations(
        data
          .filter((s: any) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s: any) => {
            const parts = [s.name, s.address, s.discount_note].filter(Boolean);
            return {
              id: `gas-${s.id}`,
              lat: Number(s.lat),
              lng: Number(s.lng),
              type: 'gas_station' as const,
              label: s.name,
              avatarUrl: s.logo_url || '/gas-station-logo.png',
              popup: parts.join('\n'),
            };
          })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stations;
}
