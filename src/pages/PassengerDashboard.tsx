import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Star, ArrowRight, Radio, KeyRound, ChevronRight, QrCode, X } from 'lucide-react';
import PinQrDialog from '@/components/PinQrDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';
import { useGasStations } from '@/hooks/useGasStations';
import { useRidesRealtime } from '@/hooks/useRidesRealtime';

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
  driver_id: string;
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
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [liveLocations, setLiveLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [selectedMapRideId, setSelectedMapRideId] = useState<string | null>(null);

  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);

  useEffect(() => { fetchRides(); }, []);
  useRidesRealtime(() => { fetchRides(); }, 'passenger-dash-rides');


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

  // Live driver tracking
  const liveDriverIds = useMemo(
    () => Array.from(new Set(rides.map(r => r.driver_id).filter(Boolean))),
    [rides]
  );

  useEffect(() => {
    if (liveDriverIds.length === 0) { setLiveLocations({}); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('user_locations')
        .select('profile_id, lat, lng')
        .in('profile_id', liveDriverIds);
      if (cancelled || !data) return;
      const map: Record<string, { lat: number; lng: number }> = {};
      data.forEach((row: any) => { map[row.profile_id] = { lat: Number(row.lat), lng: Number(row.lng) }; });
      setLiveLocations(map);
    };
    load();
    const channel = supabase
      .channel('passenger-dash-live-drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row || !liveDriverIds.includes(row.profile_id)) return;
        setLiveLocations(prev => ({ ...prev, [row.profile_id]: { lat: Number(row.lat), lng: Number(row.lng) } }));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [liveDriverIds.join(',')]);

  const gasStations = useGasStations();
  const mapMarkers = useMemo(() => [
    ...filteredRides.flatMap(ride => {
      const live = liveLocations[ride.driver_id];
      if (!live) return [];
      return [{
        id: ride.id,
        lat: live.lat,
        lng: live.lng,
        type: 'live-driver' as const,
        avatarUrl: ride.driver?.avatar_url ?? null,
        label: ride.driver?.full_name ?? 'Vodič',
      }];
    }),
    ...gasStations,
  ], [filteredRides, liveLocations, gasStations]);

  const selectedMapRide = useMemo(
    () => filteredRides.find(r => r.id === selectedMapRideId) || null,
    [filteredRides, selectedMapRideId]
  );

  const handleMarkerClick = (id: string) => {
    setSelectedMapRideId(prev => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 overflow-x-hidden">
      <Navigation />

      <div className="container mx-auto px-3 sm:px-4 pt-4 pb-6 sm:pt-8 max-w-full">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 sm:mb-10"
        >
          <p className="section-label mb-2 truncate">Pasažier · {formatDbDate(new Date().toISOString(), 'EEEE, d. MMM', { locale: sk })}</p>
          <h1 className="text-[24px] xs:text-[28px] sm:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] break-words">
            Kam dnes,<br />
            <span className="text-muted-foreground truncate block">{profile?.full_name?.split(' ')[0]}?</span>
          </h1>
        </motion.div>



        {/* ACTIVE RIDE PIN BANNER */}
        {activeRequest && activeRequest.pin_code && !activeRequest.pin_used && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="card-ink rounded-2xl p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background/10 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-background/60 font-semibold mb-0.5">
                    {activeRequest.status === 'driver_arrived' ? 'Vodič je na mieste · ukáž PIN' : 'Tvoj PIN pre vodiča'}
                  </p>
                  <p className="display-mono text-2xl sm:text-4xl text-background tracking-[0.25em] leading-none">
                    {activeRequest.pin_code}
                  </p>
                  {activeRequest.ride && (
                    <p className="text-[11px] text-background/60 mt-2 truncate">
                      {activeRequest.ride.origin_address} → {activeRequest.ride.destination_address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 gap-2 rounded-full"
                  onClick={() => setQrOpen(true)}
                >
                  <QrCode className="w-4 h-4" />
                  Zobraziť QR
                </Button>
                <Link to={`/track/${activeRequest.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1 rounded-full bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background">
                    Detail
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {activeRequest?.pin_code && (
          <PinQrDialog open={qrOpen} onOpenChange={setQrOpen} pin={activeRequest.pin_code} />
        )}





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
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums">{mapMarkers.length} live</span>
          </div>
          <div className="card-mono overflow-hidden relative">
            <Map className="h-[260px] sm:h-[420px]" markers={mapMarkers} onMarkerClick={handleMarkerClick} zoom={7} preferStatic={false} />
            <AnimatePresence>
              {selectedMapRide && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="absolute left-3 right-3 bottom-3 z-10 bg-background border border-border rounded-2xl p-4 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center font-semibold shrink-0">
                      {selectedMapRide.driver?.avatar_url ? (
                        <img src={selectedMapRide.driver.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (selectedMapRide.driver?.full_name?.charAt(0) || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm truncate">{selectedMapRide.driver?.full_name}</p>
                        {selectedMapRide.status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-foreground text-background px-1.5 py-0.5 rounded-sm">
                            <Radio className="w-2 h-2" /> Live
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2">
                        <Star className="w-2.5 h-2.5 fill-foreground text-foreground" />
                        <span className="tabular-nums">{selectedMapRide.driver?.rating?.toFixed(1) || '5.0'}</span>
                        {selectedMapRide.driver?.car_model && <span className="truncate">· {selectedMapRide.driver.car_model}</span>}
                      </p>
                      <div className="text-xs space-y-1 mb-3">
                        <div className="flex gap-2"><span className="text-muted-foreground shrink-0">Odkiaľ:</span><span className="truncate font-medium">{selectedMapRide.origin_address}</span></div>
                        <div className="flex gap-2"><span className="text-muted-foreground shrink-0">Kam:</span><span className="truncate font-medium">{selectedMapRide.destination_address}</span></div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="tabular-nums">{formatDbDate(selectedMapRide.departure_time, 'd. MMM HH:mm', { locale: sk })}</span>
                          <span>· <Users className="w-3 h-3 inline" /> {selectedMapRide.available_seats}</span>
                          <span>· {selectedMapRide.price_per_seat}€</span>
                        </div>
                        <Button size="sm" className="rounded-full h-8 text-xs" onClick={() => navigate(`/ride/${selectedMapRide.id}`)}>
                          Pripojiť sa
                        </Button>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMapRideId(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {mapMarkers.length === 0 && (
              <div className="absolute inset-x-3 top-3 z-10 bg-background/90 backdrop-blur border border-border rounded-xl px-3 py-2 text-[11px] text-muted-foreground">
                Žiadni vodiči práve teraz nezdieľajú polohu. Klikni na vodiča na mape pre detail a možnosť pripojiť sa.
              </div>
            )}
          </div>
        </motion.div>

        {/* RESULTS */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Live · Aktuálne</p>
              <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em]">Najbližšie jazdy</h2>
            </div>
            {filteredRides.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{filteredRides.length} výsledkov</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-white/40 bg-white/40 backdrop-blur-xl p-5 animate-pulse dark:bg-white/[0.03] dark:border-white/10">
                  <div className="h-4 bg-foreground/10 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-foreground/10 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="rounded-3xl border border-white/40 bg-white/40 backdrop-blur-xl p-10 sm:p-14 text-center dark:bg-white/[0.03] dark:border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-foreground" strokeWidth={1.6} />
              </div>
              <h3 className="text-base font-semibold tracking-tight mb-1">Žiadne jazdy</h3>
              <p className="text-sm text-muted-foreground mb-5">Skús upraviť vyhľadávanie</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setSearchFrom(''); setSearchTo(''); }}>
                Vymazať filtre
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredRides.map((ride, index) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                const isLive = ride.status === 'in_progress';
                return (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * Math.min(index, 8), ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -2 }}
                  >
                    <Link to={`/ride/${ride.id}`} className="block">
                      <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/50 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_48px_-16px_rgba(0,0,0,0.18)] hover:border-foreground/30 transition-all duration-300 cursor-pointer group dark:bg-white/[0.04] dark:border-white/10 dark:hover:border-white/25">
                        {/* Decorative glass orbs */}
                        <div className="pointer-events-none absolute -top-16 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl opacity-60" />
                        <div className="pointer-events-none absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-gradient-to-tr from-accent/15 to-primary/10 blur-3xl opacity-50" />
                        {isLive && (
                          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-emerald-400/30" />
                        )}

                        <div className="relative p-4 sm:p-5">
                          {/* Top: date + LIVE + price */}
                          <div className="flex items-center justify-between mb-4 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground bg-foreground/[0.04] border border-foreground/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
                                <span className="tabular-nums">{date}</span>
                              </span>
                              {isLive && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold bg-emerald-500/90 text-white px-2 py-1 rounded-full backdrop-blur-sm shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                                  <span className="relative flex w-1.5 h-1.5">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                                  </span>
                                  Live
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline gap-0.5 shrink-0">
                              <span className="display-mono text-2xl sm:text-3xl font-bold text-foreground leading-none tracking-tight">
                                {ride.price_per_seat}
                              </span>
                              <span className="text-sm text-muted-foreground font-medium">€</span>
                            </div>
                          </div>

                          {/* Route */}
                          <div className="flex gap-3.5">
                            <div className="flex flex-col items-center pt-1">
                              <span className="text-[11px] font-mono font-bold tabular-nums text-foreground">{time}</span>
                              <div className="flex flex-col items-center flex-1 my-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-foreground ring-4 ring-foreground/10" />
                                <div className="w-px flex-1 min-h-[22px] bg-gradient-to-b from-foreground/40 via-foreground/20 to-foreground/40 my-1.5" />
                                <div className="w-2.5 h-2.5 rounded-full bg-background border-2 border-foreground" />
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                              <div className="truncate font-semibold text-[14px] sm:text-[15px] tracking-tight">{ride.origin_address}</div>
                              <div className="h-3 sm:h-5" />
                              <div className="truncate font-semibold text-[14px] sm:text-[15px] tracking-tight">{ride.destination_address}</div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-foreground/10 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 border border-white/60 flex items-center justify-center text-foreground font-bold text-sm shrink-0 overflow-hidden shadow-sm dark:border-white/10">
                                {ride.driver?.avatar_url ? (
                                  <img src={ride.driver.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  ride.driver?.full_name?.charAt(0) || '?'
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[13px] truncate tracking-tight leading-tight">{ride.driver?.full_name}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span className="tabular-nums font-semibold text-foreground/80">{ride.driver?.rating?.toFixed(1) || '5.0'}</span>
                                  {ride.driver?.car_model && (
                                    <span className="truncate ml-1">· {ride.driver.car_model}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-foreground/[0.04] border border-foreground/10 rounded-full px-2 py-1">
                                <Users className="w-3 h-3" />
                                <span className="tabular-nums">{ride.available_seats}</span>
                              </span>
                              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
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
