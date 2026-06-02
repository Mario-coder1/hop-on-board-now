import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on the `rides` table and invokes
 * `onChange` whenever any ride row is inserted, updated or deleted.
 * Use to keep available_seats counters live across all ride listings.
 */
export function useRidesRealtime(onChange: () => void, channelName = 'rides-live') {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    const channel = supabase
      .channel(`${channelName}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => cbRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelName]);
}
