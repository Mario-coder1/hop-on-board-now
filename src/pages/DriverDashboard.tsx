import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Car, MapPin, Clock, Users, ChevronRight, Bell, TrendingUp, Radio, CircleOff, Navigation as NavIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';
import { useLocationBroadcast } from '@/hooks/useDriverTracking';

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
    phone: string | null;
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
    if (profile) {
      fetchData();
    }
  }, [profile]);

  // Realtime subscription for ride requests and rides
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('driver-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        (payload) => {
          console.log('[Realtime] Ride request changed:', payload);
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('[Realtime] Ride changed:', payload);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    
    // Fetch rides first
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', profile.id)
      .order('departure_time', { ascending: true });

    if (!ridesError && ridesData) {
      setRides(ridesData as Ride[]);
      
      // Then fetch pending requests for these rides
      if (ridesData.length > 0) {
        const rideIds = ridesData.map(r => r.id);
        const { data: requestsData, error: requestsError } = await supabase
          .from('ride_requests')
          .select(`
            *,
            passenger:profiles!ride_requests_passenger_id_fkey(full_name, rating, avatar_url, phone),
            ride:rides!ride_requests_ride_id_fkey(origin_address, destination_address)
          `)
          .eq('status', 'pending')
          .in('ride_id', rideIds);

        if (!requestsError && requestsData) {
          console.log('[Fetch] Pending requests:', requestsData.length);
          setRequests(requestsData as unknown as RideRequest[]);
        }
      } else {
        setRequests([]);
      }
    }
    setLoading(false);
  };

  const handleRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    // Get the ride_id from the request
    const request = requests.find(r => r.id === requestId);
    
    await supabase
      .from('ride_requests')
      .update({ status: action })
      .eq('id', requestId);
    
    // If accepted, decrement available seats
    if (action === 'accepted' && request) {
      const ride = rides.find(r => r.id === request.ride_id);
      if (ride && ride.available_seats > 0) {
        await supabase
          .from('rides')
          .update({ available_seats: ride.available_seats - 1 })
          .eq('id', request.ride_id);
        
        // Update local state
        setRides(prev => prev.map(r => 
          r.id === request.ride_id 
            ? { ...r, available_seats: r.available_seats - 1 }
            : r
        ));
      }
    }
    
    fetchData();
  };

  const openNavigation = (lat: number, lng: number) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let url: string;
    
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    } else if (isAndroid) {
      url = `google.navigation:q=${lat},${lng}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    window.open(url, '_blank');
  };

  // Count accepted passengers per ride
  const getAcceptedCount = (rideId: string) => {
    // This would need to be fetched from accepted requests
    return 0; // Placeholder
  };
  const activeRides = rides.filter(r => r.status === 'active' || r.status === 'in_progress');
  const mapMarkers = activeRides.flatMap(ride => [
    {
      id: `${ride.id}-origin`,
      lat: Number(ride.origin_lat),
      lng: Number(ride.origin_lng),
      type: 'origin' as const,
      popup: ride.origin_address
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
          className="flex items-center justify-between gap-3 mb-5"
        >
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold truncate">
              Ahoj, <span className="gradient-text">{profile?.full_name?.split(' ')[0]}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
              Pripravený na ďalšiu jazdu?
            </p>
          </div>
          <Link to="/create-ride" className="shrink-0">
            <Button variant="hero" size="sm" className="gap-1.5 sm:size-default sm:gap-2">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Vytvoriť jazdu</span>
              <span className="sm:hidden">Nová</span>
            </Button>
          </Link>
        </motion.div>

        {/* Tracking pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5"
        >
          {isTracking ? (
            <button
              onClick={stopTracking}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl glass border border-success/30 hover:border-success/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="font-medium">Zdieľaš svoju polohu</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CircleOff className="w-3.5 h-3.5" /> Vypnúť
              </span>
            </button>
          ) : (
            <button
              onClick={startTracking}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl glass hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <Radio className="w-4 h-4 text-primary" />
                <span className="font-medium">Zdieľať polohu pasažierom</span>
              </div>
              <span className="text-xs text-primary font-medium">Zapnúť</span>
            </button>
          )}
        </motion.div>

        {/* Stats - simplified compact grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5"
        >
          {[
            { label: 'Aktívne', value: activeRides.length, icon: Car, color: 'text-primary' },
            { label: 'Žiadosti', value: requests.length, icon: Bell, color: 'text-accent' },
            { label: 'Jázd', value: profile?.total_rides || 0, icon: TrendingUp, color: 'text-success' },
            { label: 'Hodnotenie', value: `${profile?.rating?.toFixed(1) || '5.0'}★`, icon: Users, color: 'text-warning' }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-card border border-border p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{stat.label}</p>
              </div>
              <p className="text-lg sm:text-xl font-bold leading-tight">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-5"
          >
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent" />
                  <h3 className="font-display text-base font-semibold">Žiadosti</h3>
                </div>
                <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
              </div>
              <div className="divide-y divide-border/60">
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="p-3 sm:p-4">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-[hsl(25_90%_55%)] flex items-center justify-center text-accent-foreground font-semibold text-sm shrink-0 overflow-hidden">
                        {request.passenger?.avatar_url ? (
                          <img src={request.passenger.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          request.passenger?.full_name?.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{request.passenger?.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          ⭐ {request.passenger?.rating?.toFixed(1)} · 📍 {request.pickup_address}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1 h-8 rounded-lg"
                        onClick={() => handleRequest(request.id, 'accepted')}
                      >
                        Prijať
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 rounded-lg"
                        onClick={() => handleRequest(request.id, 'rejected')}
                      >
                        Odmietnuť
                      </Button>
                    </div>
                  </div>
                ))}
                {requests.length > 3 && (
                  <Link to="/my-rides" className="block px-4 py-2.5 text-xs text-primary text-center hover:bg-muted/40">
                    + {requests.length - 3} ďalších
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-border/60">
              <h3 className="font-display text-base font-semibold">Vaše aktívne jazdy</h3>
            </div>
            <Map 
              className="h-[260px] sm:h-[340px]" 
              markers={mapMarkers}
              zoom={8}
            />
          </div>
        </motion.div>

        {/* Active Rides List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg sm:text-xl font-bold">Vaše jazdy</h2>
            <Link to="/my-rides" className="text-sm text-primary hover:underline flex items-center gap-1">
              Všetky <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl bg-card border border-border p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeRides.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-10 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Car className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold mb-1">Žiadne aktívne jazdy</h3>
              <p className="text-sm text-muted-foreground mb-4">Vytvorte novú jazdu a začnite zarábať</p>
              <Link to="/create-ride">
                <Button variant="hero" size="sm">Vytvoriť jazdu</Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {activeRides.slice(0, 6).map((ride) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                return (
                  <div key={ride.id} className="rounded-2xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">{date}</span>
                        <Badge variant={ride.status === 'in_progress' ? 'default' : 'secondary'} className="rounded-md h-5 px-1.5 text-[10px]">
                          {ride.status === 'active' ? 'Aktívna' : 'Prebieha'}
                        </Badge>
                      </div>
                      <span className="font-bold text-lg text-primary leading-none">{ride.price_per_seat}€</span>
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

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {ride.available_seats} miest
                      </span>
                      <div className="flex gap-1.5">
                        <Link to={`/ride/${ride.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                            Detail
                          </Button>
                        </Link>
                        <Link to={`/manage-passengers/${ride.id}`}>
                          <Button variant="hero" size="sm" className="h-8 px-2.5 text-xs gap-1">
                            <NavIcon className="w-3.5 h-3.5" />
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

export default DriverDashboard;