import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, Star, ArrowRight, Radio, KeyRound, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';

interface ActiveRequest {
  id: string;
  ride_id: string;
  status: string;
  pin_code: string | null;
  pin_used: boolean;
  pin_verified_at: string | null;
  ride: { origin_address: string; destination_address: string } | null;
}

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

  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);

  useEffect(() => { fetchRides(); }, []);

  useEffect(() => {
    if (!profile) return;
    fetchActiveRequest();
    const channel = supabase
      .channel('passenger-active-req')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests', filter: `passenger_id=eq.${profile.id}` }, () => fetchActiveRequest())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const fetchActiveRequest = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('ride_requests')
      .select('id, ride_id, status, pin_code, pin_used, pin_verified_at, ride:rides!ride_requests_ride_id_fkey(origin_address, destination_address)')
      .eq('passenger_id', profile.id)
      .in('status', ['accepted', 'driver_arrived'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveRequest(data as unknown as ActiveRequest | null);
  };

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
    if (!error && data) setRides(data as unknown as Ride[]);
    setLoading(false);
  };

  const filteredRides = rides.filter(ride => {
    const matchesFrom = !searchFrom || ride.origin_address.toLowerCase().includes(searchFrom.toLowerCase());
    const matchesTo = !searchTo || ride.destination_address.toLowerCase().includes(searchTo.toLowerCase());
    return matchesFrom && matchesTo;
  });

  const mapMarkers = filteredRides.flatMap(ride => [
    { id: `${ride.id}-origin`, lat: Number(ride.origin_lat), lng: Number(ride.origin_lng), type: 'origin' as const, popup: `<strong>${ride.origin_address}</strong>` },
    { id: `${ride.id}-dest`, lat: Number(ride.destination_lat), lng: Number(ride.destination_lng), type: 'destination' as const, popup: ride.destination_address }
  ]);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <Navigation />

      <div className="container mx-auto px-4 pt-4 pb-6 sm:pt-8">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 sm:mb-10"
        >
          <p className="section-label mb-2">Pasažier · {formatDbDate(new Date().toISOString(), 'EEEE, d. MMM', { locale: sk })}</p>
          <h1 className="text-[34px] sm:text-[56px] leading-[0.95] font-bold tracking-[-0.04em]">
            Kam dnes,<br />
            <span className="text-muted-foreground">{profile?.full_name?.split(' ')[0]}?</span>
          </h1>
        </motion.div>

        {/* SEARCH BAR — flat hairline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="card-mono p-1.5 sm:p-2">
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-1">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground" />
                <Input
                  placeholder="Odkiaľ?"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="pl-10 h-12 border-0 bg-transparent !shadow-none focus-visible:ring-0 text-[15px] font-medium"
                />
              </div>
              <div className="hidden sm:block w-px bg-border my-2" />
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-foreground" />
                <Input
                  placeholder="Kam?"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="pl-10 h-12 border-0 bg-transparent !shadow-none focus-visible:ring-0 text-[15px] font-medium"
                />
              </div>
              <Link to="/search" className="sm:shrink-0">
                <Button size="lg" className="w-full sm:w-auto gap-2 h-12 rounded-full px-6">
                  <Search className="w-4 h-4" />
                  Hľadať
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* MAP */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold tracking-tight">Mapa jázd</h2>
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums">{filteredRides.length} aktívnych</span>
          </div>
          <div className="card-mono overflow-hidden">
            <Map className="h-[280px] sm:h-[360px]" markers={mapMarkers} zoom={7} preferStatic />
          </div>
        </motion.div>

        {/* RESULTS */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold tracking-tight">Najbližšie jazdy</h2>
            {filteredRides.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">{filteredRides.length} výsledkov</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-mono p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="card-mono p-10 sm:p-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-foreground" strokeWidth={1.6} />
              </div>
              <h3 className="text-base font-semibold tracking-tight mb-1">Žiadne jazdy</h3>
              <p className="text-sm text-muted-foreground mb-5">Skús upraviť vyhľadávanie</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setSearchFrom(''); setSearchTo(''); }}>
                Vymazať filtre
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRides.map((ride, index) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                return (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * Math.min(index, 8) }}
                  >
                    <Link to={`/ride/${ride.id}`}>
                      <div className="card-mono hover:border-foreground/40 transition-all p-5 cursor-pointer group">
                        {/* Top: date + LIVE + price */}
                        <div className="flex items-center justify-between mb-4 gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
                            <span className="tabular-nums uppercase tracking-wider font-medium shrink-0">{date}</span>
                            {ride.status === 'in_progress' && (
                              <Badge className="bg-foreground text-background h-4 px-1.5 text-[9px] rounded-sm font-mono uppercase gap-1">
                                <Radio className="w-2 h-2" />
                                Live
                              </Badge>
                            )}
                          </div>
                          <span className="display-mono text-2xl text-foreground leading-none shrink-0">
                            {ride.price_per_seat}<span className="text-base text-muted-foreground">€</span>
                          </span>
                        </div>

                        {/* Route */}
                        <div className="flex gap-3.5">
                          <div className="flex flex-col items-center pt-1">
                            <span className="text-xs font-mono font-semibold tabular-nums">{time}</span>
                            <div className="flex flex-col items-center flex-1 my-1.5">
                              <div className="w-2 h-2 rounded-full bg-foreground" />
                              <div className="w-px flex-1 min-h-[24px] bg-border my-1" />
                              <div className="w-2 h-2 rounded-full border border-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                            <div className="truncate font-semibold text-sm tracking-tight">{ride.origin_address}</div>
                            <div className="h-5" />
                            <div className="truncate font-semibold text-sm tracking-tight">{ride.destination_address}</div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-semibold text-xs shrink-0 overflow-hidden">
                              {ride.driver?.avatar_url ? (
                                <img src={ride.driver.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                ride.driver?.full_name?.charAt(0) || '?'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs truncate tracking-tight">{ride.driver?.full_name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-foreground text-foreground" />
                                <span className="tabular-nums">{ride.driver?.rating?.toFixed(1) || '5.0'}</span>
                                {ride.driver?.car_model && (
                                  <span className="truncate ml-1">· {ride.driver.car_model}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span className="tabular-nums">{ride.available_seats}</span>
                            </span>
                            <ArrowRight className="w-4 h-4 text-foreground group-hover:translate-x-0.5 transition-transform" />
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
