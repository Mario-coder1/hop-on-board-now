import React, { lazy, Suspense } from 'react';

/**
 * Lightweight wrapper around the real Mapbox implementation.
 * Mapbox GL JS (~500 KB) + its CSS are only fetched when a page
 * actually renders a <Map />, instead of being bundled into every
 * page that imports Map at the top level.
 */

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  type: 'driver' | 'passenger' | 'origin' | 'destination' | 'pickup' | 'stop' | 'dropoff' | 'live-driver' | 'gas_station';
  popup?: string;
  avatarUrl?: string | null;
  label?: string;
};

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  waypoints?: Array<{ lat: number; lng: number }>;
  route?: Array<[number, number]>;
  plannedRoute?: Array<[number, number]>;
  showRoute?: boolean;
  onMapClick?: (lng: number, lat: number) => void;
  onMarkerClick?: (id: string) => void;
  onRouteCalculated?: (routePolyline: string) => void;
  className?: string;
  interactive?: boolean;
  preferStatic?: boolean;
}

const MapImpl = lazy(() => import('./MapImpl'));

const MapFallback: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={className}
    style={{
      width: '100%',
      height: '100%',
      minHeight: 200,
      background: 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground) / 0.1) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    }}
    aria-label="Načítavam mapu"
  >
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);

const Map: React.FC<MapProps> = (props) => (
  <Suspense fallback={<MapFallback className={props.className} />}>
    <MapImpl {...props} />
  </Suspense>
);

export default Map;
