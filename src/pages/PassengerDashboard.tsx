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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold mb-2">
            Kam <span className="gradient-text">cestujete</span>?
          </h1>
          <p className="text-muted-foreground">
            Nájdite si spolujazdu a cestujte výhodne
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-card mb-6">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
                  <Input
                    placeholder="Odkiaľ?"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent" />
                  <Input
                    placeholder="Kam?"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <Link to="/search">
                  <Button variant="hero" size="lg" className="w-full md:w-auto gap-2">
                    <Search className="w-5 h-5" />
                    Hľadať
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation2 className="w-5 h-5 text-primary" />
                Dostupné jazdy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Map 
                className="h-[300px] md:h-[400px]" 
                markers={mapMarkers}
                zoom={7}
              />
            </CardContent>
          </Card>
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
                <Card key={i} className="border-0 shadow-card animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </div>
                      <div className="h-8 bg-muted rounded w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">Žiadne jazdy nenájdené</h3>
                <p className="text-muted-foreground mb-4">Skúste upraviť vyhľadávanie alebo sa vráťte neskôr</p>
                <Button variant="outline" onClick={() => { setSearchFrom(''); setSearchTo(''); }}>
                  Vymazať filtre
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRides.map((ride, index) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Link to={`/ride/${ride.id}`}>
                    <Card className="border-0 shadow-card hover:shadow-lg transition-all cursor-pointer group">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Driver Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                              {ride.driver?.full_name?.charAt(0) || '?'}
                            </div>
                          </div>

                          {/* Ride Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{ride.driver?.full_name}</span>
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                                {ride.driver?.rating?.toFixed(1) || '5.0'}
                              </span>
                              {ride.status === 'in_progress' && (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white gap-1 animate-pulse">
                                  <Radio className="w-3 h-3" />
                                  LIVE
                                </Badge>
                              )}
                            </div>
                            
                            {ride.driver?.car_model && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {ride.driver.car_color} {ride.driver.car_model}
                              </p>
                            )}

                            {/* Route */}
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                <div className="w-0.5 h-8 bg-border" />
                                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                              </div>
                              <div className="flex-1 space-y-4">
                                <div>
                                  <p className="font-medium text-sm">{ride.origin_address}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDbDate(ride.departure_time, 'EEEE d. MMMM, HH:mm', { locale: sk })}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{ride.destination_address}</p>
                                </div>
                              </div>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {ride.available_seats} voľné
                              </span>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-2xl font-bold text-primary">
                              {ride.price_per_seat}€
                            </div>
                            <span className="text-xs text-muted-foreground">za miesto</span>
                            <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                              Detail <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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