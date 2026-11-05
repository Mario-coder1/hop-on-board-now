import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverTracking } from '@/hooks/useDriverTracking';

export function usePickupPassed(rideId: string | undefined, driverId: string | null, lat: number, lng: number) {
  const { location } = useDriverTracking(driverId);
  const [passed, setPassed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setPassed(false);
    setFailed(false);
    if (!rideId || !lat || !driverId) return;
    let cancelled = false;
    setChecking(true);
    void supabase.rpc('is_pickup_passed', { _ride_id: rideId, _pickup_lat: lat, _pickup_lng: lng })
      .then(({ data, error }) => {
        if (cancelled) return;
        setPassed(data === true);
        setFailed(!!error);
        setChecking(false);
      });
    return () => { cancelled = true; };
  }, [rideId, driverId, lat, lng, location?.updated_at]);
  return { passed, checking, failed };
}