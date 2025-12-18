import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin } from 'lucide-react';
import Map from './Map';
import { useDriverTracking } from '@/hooks/useDriverTracking';

interface LiveTrackingMapProps {
  driverProfileId: string;
  passengerLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  className?: string;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  driverProfileId,
  passengerLocation,
  destinationLocation,
  className = ''
}) => {
  const { location, isLoading, error } = useDriverTracking(driverProfileId);

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
        zoom={14}
        markers={markers}
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
              <span>Aktualizované: {new Date(location.updated_at).toLocaleTimeString('sk-SK')}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LiveTrackingMap;
