import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Users, ArrowRight, Filter, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  status: string;
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
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-5 sm:mb-8">Hľadať jazdy</h1>

          {/* Search Bar */}
          <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border mb-6 sm:mb-8">
            <div className="grid sm:grid-cols-3 gap-3">
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

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Results */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredRides.length} {filteredRides.length === 1 ? 'jazda' : 'jazdy'}
                </p>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtre
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-5 rounded-2xl bg-card border border-border animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredRides.length === 0 ? (
                <div className="p-10 sm:p-12 rounded-2xl bg-card border border-border text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Žiadne jazdy</h3>
                  <p className="text-muted-foreground">Skúste zmeniť vyhľadávacie kritériá</p>
                </div>
              ) : (
                filteredRides.map((ride, index) => {
                  const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                  const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                  const stops = (ride.ride_stops ?? []).slice().sort((a, b) => a.stop_order - b.stop_order).slice(0, 3);
                  return (
                    <motion.div
                      key={ride.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => setSelectedRide(ride)}
                      className={`p-4 sm:p-5 rounded-2xl bg-card border cursor-pointer transition-all hover:shadow-md ${
                        selectedRide?.id === ride.id ? 'border-primary shadow-md' : 'border-border'
                      }`}
                    >
                      {/* Header: date + LIVE badge + price */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-medium">{date}</span>
                          {ride.status === 'in_progress' && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1 animate-pulse h-5 px-1.5 text-[10px]">
                              <Radio className="w-2.5 h-2.5" />
                              LIVE
                            </Badge>
                          )}
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-primary leading-none">{ride.price_per_seat}€</span>
                      </div>

                      {/* BlaBlaCar route layout */}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <span className="text-sm font-semibold tabular-nums">{time}</span>
                          <div className="flex flex-col items-center flex-1 my-1.5">
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-primary" />
                            <div className="w-px flex-1 min-h-[20px] border-l-2 border-dotted border-muted-foreground/40 my-1" />
                            {stops.map((stop) => (
                              <div key={stop.id} className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <div className="w-px h-4 border-l-2 border-dotted border-muted-foreground/40 my-1" />
                              </div>
                            ))}
                            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col py-0.5 min-w-0">
                          <div className="truncate font-medium text-sm">{ride.origin_address}</div>
                          {stops.length > 0 && (
                            <div className="flex flex-col gap-1 my-1.5">
                              {stops.map((stop) => (
                                <div key={stop.id} className="truncate text-xs text-muted-foreground">
                                  {stop.address}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="truncate font-medium text-sm mt-auto">{ride.destination_address}</div>
                        </div>
                      </div>

                      {/* Footer: driver + seats + detail */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {ride.driver?.avatar_url ? (
                              <img
                                src={ride.driver.avatar_url}
                                alt={`${ride.driver?.full_name ?? 'Vodič'} profilová fotka vodiča`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium">{(ride.driver?.full_name?.[0] ?? '?').toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{ride.driver?.full_name ?? 'Vodič'}</p>
                            <p className="text-[11px] text-muted-foreground">⭐ {ride.driver?.rating?.toFixed(1) ?? '5.0'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            {ride.available_seats}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ride/${ride.id}`);
                            }}
                          >
                            Detail
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Map - hidden on mobile, shown on lg */}
            <div className="hidden lg:block lg:sticky lg:top-24">
              <Map markers={markers} className="h-[600px]" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SearchRides;
