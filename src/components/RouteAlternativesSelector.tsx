import { useEffect, useState } from 'react';
import { Loader2, Route as RouteIcon, Clock, Navigation, Zap, TrafficCone, MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

export interface RouteOption {
  index: number;
  coordinates: Array<[number, number]>;
  durationSec: number;
  distanceM: number;
  summary?: string;
}

interface Props {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  waypoints?: Array<{ lat: number; lng: number }>;
  selectedIndex: number;
  onSelect: (route: RouteOption) => void;
  onRoutesLoaded?: (routes: RouteOption[]) => void;
}

const formatDuration = (sec: number) => {
  if (sec < 60) return '< 1 min';
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h} h ${m} min`;
};

const formatDistance = (m: number) => `${(m / 1000).toFixed(1)} km`;

const RouteAlternativesSelector = ({
  origin,
  destination,
  waypoints = [],
  selectedIndex,
  onSelect,
  onRoutesLoaded,
}: Props) => {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination || !origin.lat || !destination.lat) {
      setRoutes([]);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const coords = [
          `${origin.lng},${origin.lat}`,
          ...waypoints.map((w) => `${w.lng},${w.lat}`),
          `${destination.lng},${destination.lat}`,
        ].join(';');

        // Mapbox returns alternatives only when there are no via-waypoints
        const canHaveAlternatives = waypoints.length === 0;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&alternatives=${canHaveAlternatives}&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();

        if (!data.routes || data.routes.length === 0) {
          setError('Nepodarilo sa nájsť trasu.');
          setRoutes([]);
          return;
        }

        const opts: RouteOption[] = data.routes.map((r: any, idx: number) => ({
          index: idx,
          coordinates: r.geometry.coordinates,
          durationSec: r.duration,
          distanceM: r.distance,
          summary: r.legs?.map((l: any) => l.summary).filter(Boolean).join(' • ') || undefined,
        }));

        setRoutes(opts);
        onRoutesLoaded?.(opts);

        // Auto-select first route if current selection is invalid
        const validIdx = opts.find((o) => o.index === selectedIndex);
        if (!validIdx) {
          onSelect(opts[0]);
        } else {
          // Re-emit the matching route so parent gets updated coordinates
          onSelect(validIdx);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('[RouteAlternatives] fetch failed', e);
          setError('Chyba pri načítaní trasy.');
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
    // Intentionally exclude selectedIndex/onSelect to avoid refetch loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, JSON.stringify(waypoints)]);

  if (!origin || !destination || !origin.lat || !destination.lat) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <RouteIcon className="w-4 h-4" />
          Vyber trasu
        </label>
        {routes.length > 1 && (
          <span className="text-xs text-muted-foreground">{routes.length} alternatívy</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
          <Loader2 className="w-4 h-4 animate-spin" />
          Hľadám trasy...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive p-3 rounded-lg bg-destructive/10">{error}</div>
      )}

      {!loading && routes.length > 0 && (
        <div className="space-y-2">
          {routes.map((r, idx) => {
            const isSelected = r.index === selectedIndex;
            const labels = ['Najrýchlejšia', 'Alternatíva', 'Iná alternatíva'];
            return (
              <button
                key={r.index}
                type="button"
                onClick={() => onSelect(r)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-sm font-semibold', isSelected && 'text-primary')}>
                    {labels[idx] || `Trasa ${idx + 1}`}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                      Vybraná
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(r.durationSec)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {formatDistance(r.distanceM)}
                  </span>
                </div>
                {r.summary && (
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">cez {r.summary}</p>
                )}
              </button>
            );
          })}
          {routes.length === 1 && waypoints.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Alternatívy nie sú dostupné, keď má jazda zastávky.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteAlternativesSelector;
