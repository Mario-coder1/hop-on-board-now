import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, MapPin, Clock, Wifi, WifiOff, Gauge, Phone, Share2, MoreVertical, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Map from './Map';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { supabase } from '@/integrations/supabase/client';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

interface LiveTrackingMapProps {
  driverProfileId: string;
  passengerLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  originLocation?: { lat: number; lng: number };
  plannedRoute?: Array<[number, number]>;
  className?: string;
}

// Linear interpolation between two coords over `duration` ms for smoother marker movement
const useSmoothedLocation = (
  raw: { lat: number; lng: number; heading: number | null; speed: number | null; updated_at: string } | null,
  duration = 1200
) => {
  const [smooth, setSmooth] = useState(raw);
  const fromRef = useRef(raw);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!raw) { setSmooth(null); return; }
    const from = fromRef.current ?? raw;
    if (from.lat === raw.lat && from.lng === raw.lng) {
      // No movement, just propagate metadata (speed/heading/updated_at)
      setSmooth(raw);
      fromRef.current = raw;
      return;
    }
    startRef.current = performance.now();
    const animate = (t: number) => {
      const k = Math.min(1, (t - startRef.current) / duration);
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setSmooth({
        lat: from.lat + (raw.lat - from.lat) * ease,
        lng: from.lng + (raw.lng - from.lng) * ease,
        heading: raw.heading,
        speed: raw.speed,
        updated_at: raw.updated_at,
      });
      if (k < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = raw;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [raw?.lat, raw?.lng, raw?.updated_at]);

  return smooth;
};

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  driverProfileId,
  passengerLocation,
  destinationLocation,
  originLocation,
  plannedRoute,
  className = ''
}) => {
  const { toast } = useToast();
  const { location: rawLocation, isLoading, error } = useDriverTracking(driverProfileId);
  const location = useSmoothedLocation(rawLocation);
  const [route, setRoute] = useState<Array<[number, number]> | null>(null);
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const [etaTargetKm, setEtaTargetKm] = useState<number | null>(null);
  const [etaTarget, setEtaTarget] = useState<'pickup' | 'destination' | null>(null);
  const [driver, setDriver] = useState<{ full_name: string | null; avatar_url: string | null; car_model: string | null; car_color: string | null; license_plate: string | null; phone: string | null } | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Tick every 5s so "last update" relative time stays fresh
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!driverProfileId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, car_model, car_color, license_plate, phone')
        .eq('id', driverProfileId)
        .maybeSingle();
      if (!cancelled && data) setDriver(data as any);
    })();
    return () => { cancelled = true; };
  }, [driverProfileId]);

  // Live route: from driver's current location to the next target (pickup, then destination).
  // This is the most useful view for the passenger — it shows the actual driving path
  // the driver is taking right now toward the next stop.
  // Throttled to avoid hammering the Directions API.
  const lastRouteFetchRef = useRef<{ lat: number; lng: number; t: number; target: string } | null>(null);
  useEffect(() => {
    if (!rawLocation) return;
    const target = passengerLocation ?? destinationLocation;
    const targetType: 'pickup' | 'destination' | null = passengerLocation
      ? 'pickup'
      : destinationLocation
        ? 'destination'
        : null;
    if (!target || !targetType) return;

    const last = lastRouteFetchRef.current;
    const now = Date.now();
    if (last && last.target === targetType) {
      const dx = (rawLocation.lat - last.lat) * 111000;
      const dy = (rawLocation.lng - last.lng) * 111000 * Math.cos((rawLocation.lat * Math.PI) / 180);
      const movedM = Math.sqrt(dx * dx + dy * dy);
      if (movedM < 80 && now - last.t < 30_000) return;
    }
    lastRouteFetchRef.current = { lat: rawLocation.lat, lng: rawLocation.lng, t: now, target: targetType };

    const ctrl = new AbortController();
    (async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${rawLocation.lng},${rawLocation.lat};${target.lng},${target.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        const r = data?.routes?.[0];
        if (r) {
          setRoute(r.geometry.coordinates);
          setEtaSec(Math.round(r.duration));
          setEtaTargetKm(Math.round((r.distance / 1000) * 10) / 10);
          setEtaTarget(targetType);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.warn('[live route] fetch failed', e);
      }
    })();
    return () => ctrl.abort();
  }, [rawLocation?.lat, rawLocation?.lng, passengerLocation?.lat, passengerLocation?.lng, destinationLocation?.lat, destinationLocation?.lng]);

  // Countdown the ETA between server-side refetches for a smoother feel
  useEffect(() => {
    if (etaSec === null) return;
    const id = setInterval(() => setEtaSec((s) => (s === null || s <= 0 ? s : s - 1)), 1000);
    return () => clearInterval(id);
  }, [etaSec === null]);

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

  // Staleness check — if no update in 45s, mark connection as weak
  const lastUpdateMs = rawLocation ? new Date(rawLocation.updated_at).getTime() : 0;
  const ageSec = rawLocation ? Math.max(0, Math.round((nowTick - lastUpdateMs) / 1000)) : null;
  const isStale = ageSec !== null && ageSec > 45;
  const relAge = ageSec === null
    ? null
    : ageSec < 5
      ? 'práve teraz'
      : ageSec < 60
        ? `pred ${ageSec} s`
        : ageSec < 3600
          ? `pred ${Math.round(ageSec / 60)} min`
          : `pred ${Math.floor(ageSec / 3600)} h`;

  const markers = React.useMemo(() => {
    const m: Array<{
      id: string;
      lat: number;
      lng: number;
      type: 'driver' | 'passenger' | 'origin' | 'destination' | 'pickup' | 'live-driver';
      popup?: string;
      avatarUrl?: string | null;
      label?: string;
    }> = [];

    if (location) {
      const carInfo = [driver?.car_color, driver?.car_model, driver?.license_plate].filter(Boolean).join(' · ');
      const speedKmh = location.speed ? `${Math.round(location.speed * 3.6)} km/h` : '0 km/h';
      m.push({
        id: 'driver',
        lat: location.lat,
        lng: location.lng,
        type: 'live-driver',
        avatarUrl: driver?.avatar_url ?? null,
        label: driver?.full_name || 'Vodič',
        popup: `<div style="min-width:160px"><strong>${driver?.full_name || 'Vodič'}</strong>${carInfo ? `<br/><span style="color:#64748b">${carInfo}</span>` : ''}<br/>Rýchlosť: ${speedKmh}</div>`
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
  }, [location, passengerLocation, destinationLocation, driver]);


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

  const speedKmh = location?.speed ? Math.round(location.speed * 3.6) : 0;
  const isMoving = speedKmh > 3;

  const handleCall = () => {
    if (driver?.phone) {
      window.location.href = `tel:${driver.phone}`;
    } else {
      toast({ title: 'Telefón nie je k dispozícii', description: 'Vodič nemá uvedené telefónne číslo.' });
    }
  };

  const handleShare = async () => {
    const etaPart = etaText ? ` ETA ${etaArrival} (${etaText})` : '';
    const drvPart = driver?.full_name ? ` Vodič: ${driver.full_name}.` : '';
    const carPart = driver?.car_model ? ` Auto: ${[driver.car_color, driver.car_model, driver.license_plate].filter(Boolean).join(' ')}.` : '';
    const text = `Som na ceste cez TakeMe.${drvPart}${carPart}${etaPart}`;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Moja jazda – TakeMe', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast({ title: 'Skopírované', description: 'Detaily jazdy sú v schránke.' });
      }
    } catch (e) {
      // user cancelled share
    }
  };

  const handleEmergency = () => {
    if (confirm('Zavolať tiesňovú linku 112?')) {
      window.location.href = 'tel:112';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Map
        center={mapCenter}
        zoom={14}
        markers={markers}
        plannedRoute={plannedRoute}
        route={route || undefined}
        className="h-full w-full"
        interactive={true}
      />
      
      {/* Right-side floating action buttons for passenger */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-1/2 -translate-y-1/2 right-3 flex flex-col gap-2 z-10"
      >
        <button
          onClick={handleCall}
          aria-label="Zavolať vodičovi"
          className="w-11 h-11 rounded-full bg-background/95 backdrop-blur-md shadow-xl border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          onClick={handleShare}
          aria-label="Zdieľať jazdu"
          className="w-11 h-11 rounded-full bg-background/95 backdrop-blur-md shadow-xl border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleEmergency}
          aria-label="Tiesňová linka 112"
          className="w-11 h-11 rounded-full bg-destructive text-destructive-foreground shadow-xl border border-destructive/50 flex items-center justify-center hover:bg-destructive/90 transition-colors active:scale-95"
        >
          <Shield className="w-5 h-5" />
        </button>
      </motion.div>
      
      
      {/* Top-left status pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-sm bg-background/95 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-xl border border-border"
      >
        <div className="flex items-center gap-2.5">
          {isLoading ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-sm font-medium">Načítavam polohu vodiča…</span>
            </>
          ) : location ? (
            <>
              <div className="relative flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${isStale ? 'bg-orange-500' : 'bg-green-500'}`} />
                {!isStale && (
                  <span className="absolute inset-0 rounded-full bg-green-500/60 animate-ping" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold leading-tight">
                    {isStale ? 'Slabý signál' : 'Naživo'}
                  </span>
                  {isStale ? (
                    <WifiOff className="w-3 h-3 text-orange-500" />
                  ) : (
                    <Wifi className="w-3 h-3 text-green-500" />
                  )}
                </div>
                {etaText && (
                  <span className="text-[11px] text-muted-foreground leading-tight truncate">
                    {etaTarget === 'pickup' ? 'k vyzdvihnutiu' : 'do cieľa'} · {etaText}
                    {etaTargetKm !== null && ` · ${etaTargetKm} km`}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-muted" />
              <span className="text-sm font-medium text-muted-foreground">Čakám na polohu vodiča…</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Bottom info bar — ETA + speed + last update */}
      <AnimatePresence>
        {location && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border overflow-hidden"
          >
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="px-3 py-2.5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  <Clock className="w-3 h-3" />
                  <span>Príchod</span>
                </div>
                <div className="font-bold text-sm sm:text-base text-foreground leading-tight mt-0.5">
                  {etaArrival ?? '—'}
                </div>
              </div>
              <div className="px-3 py-2.5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  <Gauge className="w-3 h-3" />
                  <span>Rýchlosť</span>
                </div>
                <div className={`font-bold text-sm sm:text-base leading-tight mt-0.5 ${isMoving ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {speedKmh} <span className="text-[10px] font-normal">km/h</span>
                </div>
              </div>
              <div className="px-3 py-2.5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  <MapPin className="w-3 h-3" />
                  <span>Aktualizované</span>
                </div>
                <div className={`font-bold text-xs sm:text-sm leading-tight mt-0.5 ${isStale ? 'text-orange-500' : 'text-foreground'}`}>
                  {relAge ?? '—'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveTrackingMap;
