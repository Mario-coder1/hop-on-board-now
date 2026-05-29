import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Car, Clock, Users, ChevronRight, Bell, TrendingUp, Radio, CircleOff, ArrowUpRight, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';
import { useLocationBroadcast } from '@/hooks/useDriverTracking';
import { useGasStations } from '@/hooks/useGasStations';
import { getStripeEnvironment } from '@/lib/stripe';

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
}

interface RideRequest {
  id: string;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  message: string;
  created_at: string;
  ride_id: string;
  passenger: {
    full_name: string;
    rating: number;
    avatar_url: string | null;
  };
  ride: {
    origin_address: string;
    destination_address: string;
  };
}

const DriverDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { isTracking, startTracking, stopTracking } = useLocationBroadcast(profile?.id || null);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('driver-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `driver_id=eq.${profile.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', profile.id)
      .order('departure_time', { ascending: true });

    if (!ridesError && ridesData) {
      setRides(ridesData as Ride[]);
      if (ridesData.length > 0) {
        const rideIds = ridesData.map(r => r.id);
        const { data: requestsData } = await supabase
          .from('ride_requests')
          .select(`
            *,
            passenger:public_profiles!ride_requests_passenger_id_fkey(full_name, rating, avatar_url),
            ride:rides!ride_requests_ride_id_fkey(origin_address, destination_address)
          `)
          .eq('status', 'pending')
          .in('ride_id', rideIds);
        if (requestsData) setRequests(requestsData as unknown as RideRequest[]);
      } else {
        setRequests([]);
      }
    }
    setLoading(false);
  };

  const handleRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    const request = requests.find(r => r.id === requestId);
    await supabase.from('ride_requests').update({ status: action }).eq('id', requestId);
    if (action === 'accepted' && request) {
      const ride = rides.find(r => r.id === request.ride_id);
      if (ride && ride.available_seats > 0) {
        await supabase.from('rides').update({ available_seats: ride.available_seats - 1 }).eq('id', request.ride_id);
        setRides(prev => prev.map(r => r.id === request.ride_id ? { ...r, available_seats: r.available_seats - 1 } : r));
      }
    }
    if (action === 'rejected') {
      // Auto-refund the passenger
      try {
        await supabase.functions.invoke('refund-ride-payment', {
          body: { request_id: requestId, environment: getStripeEnvironment() },
        });
      } catch (e) {
        console.error('refund error', e);
      }
    }
    fetchData();
  };

  const gasStations = useGasStations();
  const activeRides = rides.filter(r => r.status === 'active' || r.status === 'in_progress');
  const mapMarkers = [
    ...activeRides.flatMap(ride => [
      { id: `${ride.id}-origin`, lat: Number(ride.origin_lat), lng: Number(ride.origin_lng), type: 'origin' as const, popup: ride.origin_address },
      { id: `${ride.id}-dest`, lat: Number(ride.destination_lat), lng: Number(ride.destination_lng), type: 'destination' as const, popup: ride.destination_address }
    ]),
    ...gasStations,
  ];

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 overflow-x-hidden">
      <Navigation />

      <div className="container mx-auto px-3 sm:px-4 pt-4 pb-6 sm:pt-8 max-w-full">
        {/* HERO HEADER — editorial */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 sm:mb-10"
        >
          <p className="section-label mb-2 truncate">Driver · {formatDbDate(new Date().toISOString(), 'EEEE, d. MMM', { locale: sk })}</p>
          <div className="flex items-end justify-between gap-2 sm:gap-3">
            <h1 className="text-[26px] xs:text-[32px] sm:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] min-w-0 break-words">
              Ahoj,<br />
              <span className="text-muted-foreground truncate block">{profile?.full_name?.split(' ')[0]}.</span>
            </h1>
            <Link to="/create-ride" className="shrink-0">
              <Button size="sm" className="gap-1.5 rounded-full sm:size-lg sm:gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nová jazda</span>
                <span className="sm:hidden text-xs">Nová</span>
              </Button>
            </Link>
          </div>
        </motion.div>


        {/* LIVE TRACKING BAR — ink-on-white when off, ink card when on */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          {isTracking ? (
            <button
              onClick={stopTracking}
              className="w-full card-ink rounded-2xl px-5 py-4 flex items-center justify-between text-left transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-background opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-background" />
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Live · zdieľaš polohu</p>
                  <p className="text-[11px] text-background/60 mt-0.5">Pasažieri ťa vidia v reálnom čase</p>
                </div>
              </div>
              <span className="text-[11px] text-background/70 flex items-center gap-1.5 uppercase tracking-wider">
                <CircleOff className="w-3.5 h-3.5" /> Stop
              </span>
            </button>
          ) : (
            <button
              onClick={startTracking}
              className="w-full card-mono px-5 py-4 flex items-center justify-between text-left active:scale-[0.99] transition-all hover:border-foreground/40"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Radio className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Zdieľať polohu pasažierom</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Zapni live tracking</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-foreground" />
            </button>
          )}
        </motion.div>

        {/* STATS — 2x2 mono grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden mb-6 sm:mb-8"
        >
          {[
            { label: 'Aktívne', value: activeRides.length, icon: Car },
            { label: 'Žiadosti', value: requests.length, icon: Bell },
            { label: 'Jázd', value: profile?.total_rides || 0, icon: TrendingUp },
            { label: 'Rating', value: (profile?.rating?.toFixed(1) || '5.0'), icon: Star, suffix: '★' }
          ].map((stat) => (
            <div key={stat.label} className="bg-card p-3 sm:p-5 min-w-0">
              <div className="flex items-center justify-between mb-2 sm:mb-3 gap-1">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.12em] text-muted-foreground font-semibold truncate">{stat.label}</p>
                <stat.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" strokeWidth={1.6} />
              </div>
              <p className="display-mono text-2xl sm:text-4xl text-foreground leading-none truncate">
                {stat.value}{(stat as any).suffix && <span className="text-sm sm:text-base text-muted-foreground ml-1">{(stat as any).suffix}</span>}
              </p>
            </div>
          ))}
        </motion.div>

        </motion.div>

        {/* PENDING REQUESTS */}
        {requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold tracking-tight">Žiadosti</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{requests.length} pending</span>
            </div>
            <div className="card-mono divide-y divide-border overflow-hidden">
              {requests.slice(0, 3).map((request) => (
                <div key={request.id} className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold text-sm shrink-0 overflow-hidden border border-border">
                      {request.passenger?.avatar_url ? (
                        <img src={request.passenger.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        request.passenger?.full_name?.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm tracking-tight truncate">{request.passenger?.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <span className="tabular-nums">{request.passenger?.rating?.toFixed(1)}★</span>
                        <span>·</span>
                        <span className="truncate">{request.pickup_address}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-full" onClick={() => handleRequest(request.id, 'accepted')}>
                      Prijať
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => handleRequest(request.id, 'rejected')}>
                      Odmietnuť
                    </Button>
                  </div>
                </div>
              ))}
              {requests.length > 3 && (
                <Link to="/my-rides" className="block px-4 py-3 text-xs font-medium text-foreground text-center hover:bg-muted">
                  + {requests.length - 3} ďalších →
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* MAP */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold tracking-tight">Mapa</h2>
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Live</span>
          </div>
          <div className="card-mono overflow-hidden">
            <Map className="h-[280px] sm:h-[360px]" markers={mapMarkers} zoom={8} />
          </div>
        </motion.div>

        {/* RIDES */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold tracking-tight">Tvoje jazdy</h2>
            <Link to="/my-rides" className="text-xs text-foreground hover:underline flex items-center gap-1 font-medium">
              Všetky <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="card-mono p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeRides.length === 0 ? (
            <div className="card-mono p-10 sm:p-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Car className="w-6 h-6 text-foreground" strokeWidth={1.6} />
              </div>
              <h3 className="text-base font-semibold tracking-tight mb-1">Žiadne aktívne jazdy</h3>
              <p className="text-sm text-muted-foreground mb-5">Vytvor jazdu a začni zarábať</p>
              <Link to="/create-ride">
                <Button size="sm" className="rounded-full">Vytvoriť jazdu</Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {activeRides.slice(0, 6).map((ride) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                return (
                  <div key={ride.id} className="card-mono p-3.5 sm:p-5 hover:border-foreground/40 transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="tabular-nums uppercase tracking-wider font-medium truncate">{date}</span>
                        {ride.status === 'in_progress' && (
                          <Badge className="bg-foreground text-background h-4 px-1.5 text-[9px] rounded-sm font-mono uppercase shrink-0">
                            Live
                          </Badge>
                        )}
                      </div>
                      <span className="display-mono text-lg sm:text-xl text-foreground shrink-0">{ride.price_per_seat}<span className="text-sm text-muted-foreground">€</span></span>
                    </div>

                    {/* Route */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span className="text-xs font-mono font-semibold tabular-nums">{time}</span>
                        <div className="flex flex-col items-center flex-1 my-1.5">
                          <div className="w-2 h-2 rounded-full bg-foreground" />
                          <div className="w-px flex-1 min-h-[18px] bg-border my-1" />
                          <div className="w-2 h-2 rounded-full border border-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div className="truncate font-semibold text-[13px] sm:text-sm tracking-tight">{ride.origin_address}</div>
                        <div className="h-4 sm:h-5" />
                        <div className="truncate font-semibold text-[13px] sm:text-sm tracking-tight">{ride.destination_address}</div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                        <Users className="w-3 h-3" />
                        <span className="tabular-nums">{ride.available_seats}</span> miest
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        <Link to={`/ride/${ride.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-[11px] rounded-full">
                            Detail
                          </Button>
                        </Link>
                        <Link to={`/manage-passengers/${ride.id}`}>
                          <Button size="sm" className="h-8 px-3 text-[11px] rounded-full">
                            Pasažieri
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DriverDashboard;
