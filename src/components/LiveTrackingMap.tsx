import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin } from 'lucide-react';
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

  // Fetch route only once when static points are known (not on driver location changes)
  useEffect(() => {
    const fetchRoute = async () => {
      // Build waypoints: origin -> pickup -> destination (static points only)
      const waypoints: Array<[number, number]> = [];
      
      if (originLocation) {
        waypoints.push([originLocation.lng, originLocation.lat]);
      }
      
      if (passengerLocation) {
        waypoints.push([passengerLocation.lng, passengerLocation.lat]);
      }
      
      if (destinationLocation) {
        waypoints.push([destinationLocation.lng, destinationLocation.lat]);
      }

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
              <span className="text-sm font-medium">Živé sledovanie aktívne</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-sm font-medium text-muted-foreground">Čakám na polohu vodiča</span>
            </>
          )}
        </div>
        
        {location && (
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <span>{location.speed ? `${Math.round(location.speed * 3.6)} km/h` : '0 km/h'}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Aktualizované: {formatDbDate(location.updated_at, 'HH:mm:ss')}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LiveTrackingMap;
