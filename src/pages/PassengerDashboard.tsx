import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Clock, Users, ChevronRight, Navigation2, Star, ArrowRight, Radio } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      
      <div className="container mx-auto px-4 py-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Kam <span className="text-gradient-hero">cestujete</span>?
          </h1>
          <p className="text-foreground/60">
            Nájdite si spolujazdu a cestujte výhodne
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-strong rounded-2xl p-4 md:p-5 mb-6 shadow-glass-lg">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                <Input
                  placeholder="Odkiaľ?"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="pl-10 h-12 bg-white/60 border-white/40 rounded-xl"
                />
              </div>
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent ring-4 ring-accent/20" />
                <Input
                  placeholder="Kam?"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="pl-10 h-12 bg-white/60 border-white/40 rounded-xl"
                />
              </div>
              <Link to="/search">
                <Button variant="hero" size="lg" className="w-full md:w-auto gap-2 rounded-xl h-12">
                  <Search className="w-5 h-5" />
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
          className="mb-6"
        >
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2">
              <Navigation2 className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Dostupné jazdy</h3>
            </div>
            <Map 
              className="h-[300px] md:h-[400px]" 
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">
              Najbližšie jazdy
              {filteredRides.length > 0 && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  ({filteredRides.length})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-white/40 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/40 rounded w-3/4 mb-3" />
                      <div className="h-4 bg-white/40 rounded w-1/2" />
                    </div>
                    <div className="h-8 bg-white/40 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]">
                <Search className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">Žiadne jazdy nenájdené</h3>
              <p className="text-foreground/60 mb-4">Skúste upraviť vyhľadávanie alebo sa vráťte neskôr</p>
              <Button variant="glass" onClick={() => { setSearchFrom(''); setSearchTo(''); }} className="rounded-2xl">
                Vymazať filtre
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRides.map((ride, index) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Link to={`/ride/${ride.id}`}>
                    <div className="glass rounded-2xl p-5 hover:shadow-glass-lg hover:scale-[1.01] transition-all cursor-pointer group">
                      <div className="flex items-start gap-4">
                        {/* Driver Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-lg shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.5)]">
                            {ride.driver?.full_name?.charAt(0) || '?'}
                          </div>
                        </div>

                        {/* Ride Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold">{ride.driver?.full_name}</span>
                            <span className="flex items-center gap-1 text-sm text-foreground/60">
                              <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                              {ride.driver?.rating?.toFixed(1) || '5.0'}
                            </span>
                            {ride.status === 'in_progress' && (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white gap-1 animate-pulse rounded-lg">
                                <Radio className="w-3 h-3" />
                                LIVE
                              </Badge>
                            )}
                          </div>
                          
                          {ride.driver?.car_model && (
                            <p className="text-sm text-foreground/60 mb-3">
                              {ride.driver.car_color} {ride.driver.car_model}
                            </p>
                          )}

                          {/* Route */}
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                              <div className="w-0.5 h-8 bg-foreground/15" />
                              <div className="w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/15" />
                            </div>
                            <div className="flex-1 space-y-4">
                              <div>
                                <p className="font-medium text-sm">{ride.origin_address}</p>
                                <p className="text-xs text-foreground/60">
                                  {formatDbDate(ride.departure_time, 'EEEE d. MMMM, HH:mm', { locale: sk })}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{ride.destination_address}</p>
                              </div>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-4 mt-4 text-sm text-foreground/60">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {ride.available_seats} voľné
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-2xl font-bold text-gradient-hero">
                            {ride.price_per_seat}€
                          </div>
                          <span className="text-xs text-foreground/60">za miesto</span>
                          <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                            Detail <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PassengerDashboard;