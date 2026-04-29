import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Clock } from 'lucide-react';
import Map from './Map';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { formatDbDate } from '@/lib/datetime';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

interface LiveTrackingMapProps {
  driverProfileId: string;
  passengerLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  originLocation?: { lat: number; lng: number };
  className?: string;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  driverProfileId,
  passengerLocation,
  destinationLocation,
  originLocation,
  className = ''
}) => {
  const { location, isLoading, error } = useDriverTracking(driverProfileId);
  const [route, setRoute] = useState<Array<[number, number]> | null>(null);
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const [etaTargetKm, setEtaTargetKm] = useState<number | null>(null);
  const [etaTarget, setEtaTarget] = useState<'pickup' | 'destination' | null>(null);

  // Fetch full route only once when static points are known (not on driver location changes)
  useEffect(() => {
    const fetchRoute = async () => {
      const waypoints: Array<[number, number]> = [];
      if (originLocation) waypoints.push([originLocation.lng, originLocation.lat]);
      if (passengerLocation) waypoints.push([passengerLocation.lng, passengerLocation.lat]);
      if (destinationLocation) waypoints.push([destinationLocation.lng, destinationLocation.lat]);

      if (waypoints.length < 2) return;

      try {
        const coordinates = waypoints.map(w => `${w[0]},${w[1]}`).join(';');
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          setRoute(data.routes[0].geometry.coordinates);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [originLocation?.lat, originLocation?.lng, passengerLocation?.lat, passengerLocation?.lng, destinationLocation?.lat, destinationLocation?.lng]);

  // Recalculate ETA from driver -> next target (pickup if not picked up yet, otherwise destination)
  // Throttled: only refetch when driver moves > ~80m or every 60s.
  const lastEtaFetchRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  useEffect(() => {
    if (!location) return;
    // Decide target: prefer pickup if available; LiveTrackingMap is reused after pickup with passengerLocation possibly absent.
    const target = passengerLocation ?? destinationLocation;
    const targetType: 'pickup' | 'destination' | null = passengerLocation
      ? 'pickup'
      : destinationLocation
        ? 'destination'
        : null;
    if (!target || !targetType) return;

    // Throttle
    const last = lastEtaFetchRef.current;
    const now = Date.now();
    if (last) {
      const dx = (location.lat - last.lat) * 111000;
      const dy = (location.lng - last.lng) * 111000 * Math.cos((location.lat * Math.PI) / 180);
      const movedM = Math.sqrt(dx * dx + dy * dy);
      if (movedM < 80 && now - last.t < 60_000) return;
    }
    lastEtaFetchRef.current = { lat: location.lat, lng: location.lng, t: now };

    const ctrl = new AbortController();
    (async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${location.lng},${location.lat};${target.lng},${target.lat}?overview=false&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        const r = data?.routes?.[0];
        if (r) {
          setEtaSec(Math.round(r.duration));
          setEtaTargetKm(Math.round((r.distance / 1000) * 10) / 10);
          setEtaTarget(targetType);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.warn('[ETA] fetch failed', e);
      }
    })();
    return () => ctrl.abort();
  }, [location?.lat, location?.lng, passengerLocation?.lat, passengerLocation?.lng, destinationLocation?.lat, destinationLocation?.lng]);

  const etaText = etaSec === null
    ? null
    : etaSec < 60
      ? '< 1 min'
      : etaSec < 3600
        ? `${Math.round(etaSec / 60)} min`
        : `${Math.floor(etaSec / 3600)} h ${Math.round((etaSec % 3600) / 60)} min`;
  const etaArrival = etaSec === null
    ? null
    : new Date(Date.now() + etaSec * 1000).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

  const markers = React.useMemo(() => {
    const m: Array<{
      id: string;
      lat: number;
      lng: number;
      type: 'driver' | 'passenger' | 'origin' | 'destination' | 'pickup';
      popup?: string;
    }> = [];

    if (location) {
      m.push({
        id: 'driver',
        lat: location.lat,
        lng: location.lng,
        type: 'driver',
        popup: `<strong>Vodič</strong><br/>Rýchlosť: ${location.speed ? `${Math.round(location.speed * 3.6)} km/h` : 'N/A'}`
      });
    }

    if (passengerLocation) {
      m.push({
        id: 'passenger',
        lat: passengerLocation.lat,
        lng: passengerLocation.lng,
        type: 'pickup',
        popup: '<strong>Miesto vyzdvihnutia</strong>'
      });
    }

    if (destinationLocation) {
      m.push({
        id: 'destination',
        lat: destinationLocation.lat,
        lng: destinationLocation.lng,
        type: 'destination',
        popup: '<strong>Cieľ</strong>'
      });
    }

    return m;
  }, [location, passengerLocation, destinationLocation]);

  const mapCenter: [number, number] = location 
    ? [location.lng, location.lat] 
    : passengerLocation 
      ? [passengerLocation.lng, passengerLocation.lat]
      : [19.699, 48.669];

  if (error) {
    return (
      <div className={`bg-destructive/10 rounded-2xl p-6 text-center ${className}`}>
        <p className="text-destructive">Chyba pri načítaní polohy: {error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Map
        center={mapCenter}
        zoom={13}
        markers={markers}
        route={route || undefined}
        className="h-full w-full"
        interactive={true}
      />
      
      {/* Status overlay */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-border"
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <>
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-sm font-medium">Načítavam polohu...</span>
            </>
          ) : location ? (
            <>
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">Živé sledovanie</span>
                {etaText && (
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {etaTarget === 'pickup' ? 'k vyzdvihnutiu' : 'do cieľa'} · {etaText}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-sm font-medium text-muted-foreground">Čakám na polohu vodiča</span>
            </>
          )}
        </div>
        
        {location && (
          <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <span>{location.speed ? `${Math.round(location.speed * 3.6)} km/h` : '0 km/h'}</span>
            </div>
            {etaText && etaArrival && (
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Clock className="w-3 h-3" />
                <span>Príchod ~{etaArrival}{etaTargetKm !== null ? ` · ${etaTargetKm} km` : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{formatDbDate(location.updated_at, 'HH:mm:ss')}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LiveTrackingMap;
