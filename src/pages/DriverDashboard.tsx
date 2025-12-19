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
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">
              Ahoj, <span className="gradient-text">{profile?.full_name?.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Pripravený na ďalšiu jazdu?
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isTracking ? (
              <Button variant="outline" onClick={stopTracking} className="gap-2">
                <CircleOff className="w-4 h-4" />
                Zastaviť zdieľanie
              </Button>
            ) : (
              <Button variant="secondary" onClick={startTracking} className="gap-2">
                <Radio className="w-4 h-4" />
                Zdieľať polohu
              </Button>
            )}
            <Link to="/create-ride">
              <Button variant="hero" size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Vytvoriť jazdu
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Aktívne jazdy', value: activeRides.length, icon: Car, color: 'text-primary' },
              { label: 'Čakajúce žiadosti', value: requests.length, icon: Bell, color: 'text-accent' },
              { label: 'Celkovo jázd', value: profile?.total_rides || 0, icon: TrendingUp, color: 'text-success' },
              { label: 'Hodnotenie', value: `${profile?.rating?.toFixed(1) || '5.0'} ⭐`, icon: Users, color: 'text-warning' }
            ].map((stat, index) => (
              <Card key={stat.label} className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Pending Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-accent" />
                  Žiadosti o jazdu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Zatiaľ žiadne žiadosti
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 3).map((request) => (
                      <div key={request.id} className="p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold">
                            {request.passenger?.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{request.passenger?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{request.passenger?.rating?.toFixed(1)} ⭐</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 truncate">
                          📍 {request.pickup_address}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleRequest(request.id, 'accepted')}
                          >
                            Prijať
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRequest(request.id, 'rejected')}
                          >
                            Odmietnuť
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card className="border-0 shadow-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Vaše aktívne jazdy</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Map 
                className="h-[300px] md:h-[400px]" 
                markers={mapMarkers}
                zoom={8}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Rides List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Vaše jazdy</h2>
            <Link to="/my-rides" className="text-sm text-primary hover:underline flex items-center gap-1">
              Zobraziť všetky <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-card animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rides.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">Zatiaľ žiadne jazdy</h3>
                <p className="text-muted-foreground mb-4">Vytvorte svoju prvú jazdu a začnite zarábať</p>
                <Link to="/create-ride">
                  <Button variant="hero">Vytvoriť jazdu</Button>
                </Link>
              </CardContent>
            </Card>
          ) : activeRides.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">Žiadne aktívne jazdy</h3>
                <p className="text-muted-foreground mb-4">Vytvorte novú jazdu a začnite zarábať</p>
                <Link to="/create-ride">
                  <Button variant="hero">Vytvoriť jazdu</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRides.slice(0, 6).map((ride) => (
                <Card key={ride.id} className="border-0 shadow-card hover:shadow-lg transition-shadow group">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant={ride.status === 'active' ? 'default' : 'secondary'}>
                          {ride.status === 'active' ? 'Aktívna' : ride.status === 'in_progress' ? 'Prebieha' : 'Ukončená'}
                        </Badge>
                        <span className="font-bold text-primary">{ride.price_per_seat}€</span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                          <div>
                            <p className="font-medium">{ride.origin_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                          <div>
                            <p className="font-medium">{ride.destination_address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(ride.departure_time), 'd MMM, HH:mm', { locale: sk })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {ride.available_seats} miest
                        </span>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Link to={`/ride/${ride.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            Detail
                          </Button>
                        </Link>
                        <Link to={`/manage-passengers/${ride.id}`} className="flex-1">
                          <Button variant="hero" size="sm" className="w-full gap-1">
                            <NavIcon className="w-4 h-4" />
                            Pasažieri
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DriverDashboard;