import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, Navigation2, Star, ArrowRight, Radio } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  driver: {
    full_name: string;
    rating: number;
    avatar_url: string | null;
    car_model: string | null;
    car_color: string | null;
  };
}

const PassengerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:public_profiles!rides_driver_id_fkey(full_name, rating, avatar_url, car_model, car_color)
      `)
      .in('status', ['active', 'in_progress'])
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(20);

    if (!error && data) {
      setRides(data as unknown as Ride[]);
    }
    setLoading(false);
  };

  const filteredRides = rides.filter(ride => {
    const matchesFrom = !searchFrom || 
      ride.origin_address.toLowerCase().includes(searchFrom.toLowerCase());
    const matchesTo = !searchTo || 
      ride.destination_address.toLowerCase().includes(searchTo.toLowerCase());
    return matchesFrom && matchesTo;
  });

  const mapMarkers = filteredRides.flatMap(ride => [
    {
      id: `${ride.id}-origin`,
      lat: Number(ride.origin_lat),
      lng: Number(ride.origin_lng),
      type: 'origin' as const,
      popup: `<strong>${ride.origin_address}</strong><br/>Odchod: ${formatDbDate(ride.departure_time, 'HH:mm')}`
    },
    {
      id: `${ride.id}-dest`,
      lat: Number(ride.destination_lat),
      lng: Number(ride.destination_lng),
      type: 'destination' as const,
      popup: ride.destination_address
    }
  ]);

  return (
    <div className="min-h-screen bg-mesh pb-32 md:pb-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
      <Navigation />
      
      <div className="container mx-auto px-4 py-5 sm:py-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">
            Kam <span className="text-gradient-hero">cestujete</span>?
          </h1>
          <p className="text-sm text-muted-foreground">
            Nájdite si spolujazdu a cestujte výhodne
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-2xl bg-card border border-border p-3 sm:p-4 mb-5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-primary" />
                <Input
                  placeholder="Odkiaľ?"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent" />
                <Input
                  placeholder="Kam?"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
              <Link to="/search" className="sm:shrink-0">
                <Button variant="hero" className="w-full sm:w-auto gap-2 h-11">
                  <Search className="w-4 h-4" />
                  Hľadať
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-border/60 flex items-center gap-2">
              <Navigation2 className="w-4 h-4 text-primary" />
              <h3 className="font-display text-base font-semibold">Dostupné jazdy</h3>
            </div>
            <Map 
              className="h-[260px] sm:h-[340px]" 
              markers={mapMarkers}
              zoom={7}
            />
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg sm:text-xl font-bold">
              Najbližšie jazdy
              {filteredRides.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({filteredRides.length})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-card border border-border p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-10 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold mb-1">Žiadne jazdy nenájdené</h3>
              <p className="text-sm text-muted-foreground mb-4">Skúste upraviť vyhľadávanie alebo sa vráťte neskôr</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchFrom(''); setSearchTo(''); }}>
                Vymazať filtre
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredRides.map((ride, index) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                return (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                  >
                    <Link to={`/ride/${ride.id}`}>
                      <div className="rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all p-4 sm:p-5 cursor-pointer group">
                        {/* Header: date + LIVE + price */}
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                            <span className="font-medium shrink-0">{date}</span>
                            {ride.status === 'in_progress' && (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1 animate-pulse h-5 px-1.5 text-[10px] rounded-md">
                                <Radio className="w-2.5 h-2.5" />
                                LIVE
                              </Badge>
                            )}
                          </div>
                          <span className="text-xl sm:text-2xl font-bold text-primary leading-none shrink-0">{ride.price_per_seat}€</span>
                        </div>

                        {/* BlaBlaCar route */}
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center pt-1">
                            <span className="text-sm font-semibold tabular-nums">{time}</span>
                            <div className="flex flex-col items-center flex-1 my-1.5">
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-primary" />
                              <div className="w-px flex-1 min-h-[20px] border-l-2 border-dotted border-muted-foreground/40 my-1" />
                              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                            <div className="truncate font-medium text-sm">{ride.origin_address}</div>
                            <div className="h-4" />
                            <div className="truncate font-medium text-sm">{ride.destination_address}</div>
                          </div>
                        </div>

                        {/* Footer: driver + seats + arrow */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0 overflow-hidden">
                              {ride.driver?.avatar_url ? (
                                <img src={ride.driver.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                ride.driver?.full_name?.charAt(0) || '?'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{ride.driver?.full_name}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Star className="w-3 h-3 fill-warning text-warning" />
                                {ride.driver?.rating?.toFixed(1) || '5.0'}
                                {ride.driver?.car_model && (
                                  <span className="truncate ml-1">· {ride.driver.car_model}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              {ride.available_seats}
                            </span>
                            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PassengerDashboard;