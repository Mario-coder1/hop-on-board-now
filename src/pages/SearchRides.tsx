import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Users, ArrowRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { supabase } from '@/integrations/supabase/client';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';

interface RideStop {
  id: string;
  address: string;
  stop_order: number;
}

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  driver: {
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
  } | null;
  ride_stops: RideStop[];
}

const SearchRides = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:public_profiles!rides_driver_id_fkey(full_name, avatar_url, rating),
        ride_stops(id, address, stop_order)
      `)
      .in('status', ['active', 'in_progress'])
      .order('departure_time', { ascending: true });

    if (error) {
      console.error('[SearchRides] fetchRides error:', error);
      setRides([]);
      setLoading(false);
      return;
    }

    setRides((data as unknown as Ride[]) ?? []);
    setLoading(false);
  };

  const filteredRides = rides.filter(ride => {
    const matchOrigin = !searchOrigin || ride.origin_address.toLowerCase().includes(searchOrigin.toLowerCase());
    const matchDestination = !searchDestination || ride.destination_address.toLowerCase().includes(searchDestination.toLowerCase());
    return matchOrigin && matchDestination;
  });

  const markers = filteredRides.flatMap(ride => [
    { id: `${ride.id}-origin`, lat: ride.origin_lat, lng: ride.origin_lng, type: 'origin' as const },
    { id: `${ride.id}-dest`, lat: ride.destination_lat, lng: ride.destination_lng, type: 'destination' as const },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold mb-8">Hľadať jazdy</h1>

          {/* Search Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border mb-8">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Odkiaľ"
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Kam"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="hero" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Hľadať
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {filteredRides.length} {filteredRides.length === 1 ? 'jazda' : 'jazdy'}
                </p>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtre
                </Button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 rounded-2xl bg-card border border-border animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredRides.length === 0 ? (
                <div className="p-12 rounded-2xl bg-card border border-border text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Žiadne jazdy</h3>
                  <p className="text-muted-foreground">Skúste zmeniť vyhľadávacie kritériá</p>
                </div>
              ) : (
                filteredRides.map((ride, index) => (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedRide(ride)}
                    className={`p-6 rounded-2xl bg-card border cursor-pointer transition-all hover:shadow-lg ${
                      selectedRide?.id === ride.id ? 'border-primary shadow-lg' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="font-medium">{ride.origin_address}</span>
                        </div>
                        {ride.ride_stops && ride.ride_stops.length > 0 && (
                          <div className="ml-1 pl-3 border-l border-border my-1">
                            {ride.ride_stops
                              .sort((a, b) => a.stop_order - b.stop_order)
                              .map((stop) => (
                                <div key={stop.id} className="flex items-center gap-2 text-sm text-muted-foreground py-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                  <span className="truncate">{stop.address}</span>
                                </div>
                              ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent" />
                          <span className="font-medium">{ride.destination_address}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">{ride.price_per_seat}€</span>
                        <p className="text-xs text-muted-foreground">za miesto</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDbDate(ride.departure_time, 'd. MMM HH:mm', { locale: sk })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {ride.available_seats} miest
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ride/${ride.id}`);
                        }}
                      >
                        Detail
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {ride.driver?.avatar_url ? (
                          <img
                            src={ride.driver.avatar_url}
                            alt={`${ride.driver?.full_name ?? 'Vodič'} profilová fotka vodiča`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">{(ride.driver?.full_name?.[0] ?? '?').toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ride.driver?.full_name ?? 'Vodič'}</p>
                        <p className="text-xs text-muted-foreground">⭐ {ride.driver?.rating?.toFixed(1) ?? '5.0'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Map */}
            <div className="lg:sticky lg:top-24">
              <Map markers={markers} className="h-[600px]" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SearchRides;