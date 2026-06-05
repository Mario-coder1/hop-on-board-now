import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Navigation as NavIcon, Phone, MessageCircle, CheckCircle, MapPin, User, Bell, Radio, CircleOff, LogOut, Flag, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NavigationBar from '@/components/Navigation';
import Map from '@/components/Map';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocationBroadcast } from '@/hooks/useDriverTracking';
import { useAutoCompleteRide } from '@/hooks/useAutoCompleteRide';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';
import { PinEntryDialog } from '@/components/PinEntryDialog';
import { useGasStations } from '@/hooks/useGasStations';

interface AcceptedPassenger {
  id: string;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  message: string | null;
  pin_verified_at: string | null;
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
  passenger: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    rating: number;
    total_rides: number | null;
  };
}

interface RideInfo {
  id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  available_seats?: number;
}

const ManagePassengers = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isTracking, startTracking, stopTracking } = useLocationBroadcast(profile?.id || null);
  
  const [passengers, setPassengers] = useState<AcceptedPassenger[]>([]);
  const [ride, setRide] = useState<RideInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPassenger, setSelectedPassenger] = useState<AcceptedPassenger | null>(null);
  const [pinDialogFor, setPinDialogFor] = useState<AcceptedPassenger | null>(null);

  // Auto-complete ride when driver arrives at destination (within 50m)
  const { completeRide } = useAutoCompleteRide(
    rideId || null,
    ride ? { lat: Number(ride.destination_lat), lng: Number(ride.destination_lng) } : null,
    profile?.id || null,
    isTracking
  );

  const [completing, setCompleting] = useState(false);

  const handleManualComplete = async () => {
    setCompleting(true);
    await completeRide();
    setCompleting(false);
    navigate('/driver');
  };

  useEffect(() => {
    if (rideId && profile) {
      fetchRideAndPassengers();
    }
  }, [rideId, profile]);

  // Realtime subscription for passenger updates
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`manage-passengers-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: `ride_id=eq.${rideId}`
        },
        () => {
          console.log('[Realtime] Passenger request changed');
          fetchRideAndPassengers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        () => { fetchRideAndPassengers(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  const fetchRideAndPassengers = async () => {
    // Fetch ride info
    const { data: rideData } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideData) {
      setRide(rideData as RideInfo);
    }

    // Fetch accepted passengers
    const { data: passengersData } = await supabase
      .from('ride_requests')
      .select(`
        id, status, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, message,
        pin_verified_at, driver_confirmed_at, passenger_confirmed_at,
        passenger:profiles!ride_requests_passenger_id_fkey(id, full_name, phone, avatar_url, rating, total_rides)
      `)
      .eq('ride_id', rideId)
      .in('status', ['accepted', 'driver_arrived', 'picked_up']);

    if (passengersData) {
      setPassengers(passengersData as unknown as AcceptedPassenger[]);
      if (passengersData.length > 0) {
        setSelectedPassenger(passengersData[0] as unknown as AcceptedPassenger);
      }
    }

    setLoading(false);
  };

  // Auto-promote to picked_up once both driver and passenger have confirmed
  const maybeActivate = async (requestId: string) => {
    const { data } = await supabase
      .from('ride_requests')
      .select('status, driver_confirmed_at, passenger_confirmed_at, pin_verified_at')
      .eq('id', requestId)
      .maybeSingle();

    if (
      data &&
      data.pin_verified_at &&
      data.driver_confirmed_at &&
      data.passenger_confirmed_at &&
      data.status !== 'picked_up' &&
      data.status !== 'completed'
    ) {
      await supabase.from('ride_requests').update({ status: 'picked_up' }).eq('id', requestId);
    }
  };

  const handlePinVerified = async (requestId: string) => {
    await maybeActivate(requestId);
    fetchRideAndPassengers();
  };

  const handleDropoff = async (requestId: string, passengerName: string) => {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'completed' })
      .eq('id', requestId);

    if (error) {
      console.error('[Dropoff] update failed:', error);
      toast({
        title: 'Nepodarilo sa dokončiť jazdu',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Restore available seat (increment by 1)
    if (ride) {
      const { error: seatErr } = await supabase
        .from('rides')
        .update({ available_seats: (ride.available_seats ?? 0) + 1 })
        .eq('id', ride.id);
      if (seatErr) console.warn('[Dropoff] seat update failed:', seatErr);
    }

    toast({
      title: 'Pasažier vystúpil',
      description: `${passengerName} bol označený ako vystúpený.`,
    });
    fetchRideAndPassengers();
  };

  const handleArrived = async (requestId: string, passengerName: string) => {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'driver_arrived' })
      .eq('id', requestId);

    if (!error) {
      toast({
        title: 'Notifikácia odoslaná',
        description: `${passengerName} bol upozornený, že ste na mieste.`,
      });
      fetchRideAndPassengers();
    }
  };

  const openNavigation = (lat: number, lng: number, address: string) => {
    // Try to open in native maps app, fallback to Google Maps
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

  // Build map markers
  const gasStations = useGasStations();
  const markers = [];
  
  if (ride) {
    markers.push({
      id: 'origin',
      lat: Number(ride.origin_lat),
      lng: Number(ride.origin_lng),
      type: 'origin' as const,
      popup: `Štart: ${ride.origin_address}`
    });
    markers.push({
      id: 'destination',
      lat: Number(ride.destination_lat),
      lng: Number(ride.destination_lng),
      type: 'destination' as const,
      popup: `Cieľ: ${ride.destination_address}`
    });
  }

  passengers.forEach(p => {
    if (!p.passenger) return; // Skip if passenger data is null
    
    // Pickup marker
    markers.push({
      id: `pickup-${p.id}`,
      lat: Number(p.pickup_lat),
      lng: Number(p.pickup_lng),
      type: 'pickup' as const,
      popup: `🟢 ${p.passenger.full_name} nastúpenie: ${p.pickup_address}`
    });
    
    // Dropoff marker (if different from destination)
    if (p.dropoff_lat && p.dropoff_lng && p.dropoff_address) {
      markers.push({
        id: `dropoff-${p.id}`,
        lat: Number(p.dropoff_lat),
        lng: Number(p.dropoff_lng),
        type: 'dropoff' as const,
        popup: `🔴 ${p.passenger.full_name} vystúpenie: ${p.dropoff_address}`
      });
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Správa pasažierov" description="Spravuj žiadosti pasažierov o tvoju jazdu." path="/manage-passengers" noindex />
        <NavigationBar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationBar />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-[13rem] md:pb-8 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="self-start">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť
            </Button>

            {/* Auto GPS status (no manual toggle) */}
            <div className="flex items-center gap-2">
              {isTracking ? (
                <Badge variant="default" className="bg-green-500 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Zdieľam polohu
                </Badge>
              ) : (
                <Button variant="secondary" size="sm" onClick={startTracking} className="gap-2">
                  <Radio className="w-4 h-4" />
                  Zapnúť GPS
                </Button>
              )}
            </div>
          </div>

          <h1 className="font-display text-xl sm:text-3xl font-bold mb-1">Vaši pasažieri</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 break-words">
            {ride?.origin_address} → {ride?.destination_address}
          </p>

          {/* Manual complete - subtle */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Jazda sa dokončí automaticky pri dosiahnutí cieľa
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 h-8"
              onClick={handleManualComplete}
              disabled={completing}
            >
              <Flag className="w-3.5 h-3.5" />
              {completing ? 'Dokončujem...' : 'Ukončiť teraz'}
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Passengers List */}
            <div className="order-2 lg:order-1 space-y-2.5 sm:space-y-4 min-w-0">
              {passengers.length === 0 ? (
                <Card className="border-0 shadow-card">
                  <CardContent className="p-6 sm:p-8 text-center">
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <h3 className="font-display text-base sm:text-lg font-semibold mb-2">Žiadni pasažieri</h3>
                    <p className="text-sm text-muted-foreground">
                      Zatiaľ nemáte žiadnych prijatých pasažierov pre túto jazdu.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                passengers.filter(p => p.passenger !== null).map((passenger) => (
                  <Card 
                    key={passenger.id} 
                    className={`border-0 shadow-card cursor-pointer transition-all overflow-hidden ${
                      selectedPassenger?.id === passenger.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedPassenger(passenger)}
                  >
                    <CardContent className="p-3 sm:p-5 min-w-0">
                      <div className="flex items-start gap-2.5 sm:gap-4 min-w-0">
                        <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {passenger.passenger.avatar_url ? (
                            <img 
                              src={passenger.passenger.avatar_url} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover" 
                            />
                          ) : (
                            <span className="text-base sm:text-xl font-semibold text-primary">
                              {passenger.passenger.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <h3 className="font-display font-semibold text-[13px] sm:text-base break-words leading-tight">
                              {passenger.passenger.full_name}
                            </h3>
                            <RideBadge totalRides={passenger.passenger.total_rides} size="xs" />
                            <Badge 
                              variant={passenger.status === 'picked_up' ? 'default' : 'secondary'} 
                              className={
                                passenger.status === 'picked_up' ? 'bg-green-500 text-[10px] sm:text-xs px-1.5 py-0' : 
                                passenger.status === 'driver_arrived' ? 'bg-amber-500 text-white text-[10px] sm:text-xs px-1.5 py-0' : 'text-[10px] sm:text-xs px-1.5 py-0'
                              }
                            >
                              {passenger.status === 'picked_up' ? 'Vyzdvihnutý' : 
                               passenger.status === 'driver_arrived' ? 'Na mieste' : 'Čaká'}
                            </Badge>
                          </div>
                          
                          <p className="text-[11px] sm:text-sm text-muted-foreground mb-1">
                            ⭐ {passenger.passenger.rating?.toFixed(1) || '5.0'}
                          </p>
                          
                          <div className="flex items-start gap-1 text-[11px] sm:text-sm">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground break-words min-w-0">
                              <span className="font-medium text-foreground">Nastúpenie:</span> {passenger.pickup_address}
                            </span>
                          </div>
                          
                          <div className="flex items-start gap-1 text-[11px] sm:text-sm mt-1">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground break-words min-w-0">
                              <span className="font-medium text-foreground">Vystúpenie:</span>{' '}
                              {passenger.dropoff_address || ride?.destination_address || 'Cieľ trasy'}
                            </span>
                          </div>

                          {passenger.message && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/50 text-[11px] sm:text-sm break-words">
                              <MessageCircle className="w-3 h-3 inline mr-1" />
                              {passenger.message}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary next-step action (single big button) */}
                      <div className="mt-3 sm:mt-4 space-y-2">
                        {passenger.status === 'accepted' && (
                          <Button
                            size="lg"
                            className="w-full gap-2 h-12 text-sm sm:text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArrived(passenger.id, passenger.passenger.full_name);
                            }}
                          >
                            <Bell className="w-5 h-5" />
                            Som na mieste — upozorniť pasažiera
                          </Button>
                        )}

                        {passenger.status === 'driver_arrived' && !passenger.driver_confirmed_at && (
                          <Button
                            size="lg"
                            className="w-full gap-2 h-12 text-sm sm:text-base font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinDialogFor(passenger);
                            }}
                          >
                            <KeyRound className="w-5 h-5" />
                            Overiť PIN a začať jazdu
                          </Button>
                        )}

                        {passenger.status === 'picked_up' && (
                          <Button
                            size="lg"
                            className="w-full gap-2 h-12 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDropoff(passenger.id, passenger.passenger.full_name);
                            }}
                          >
                            <LogOut className="w-5 h-5" />
                            Pasažier vystúpil — ukončiť
                          </Button>
                        )}

                        {/* Secondary actions — compact */}
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8 px-2.5 text-[11px] sm:text-xs flex-1 min-w-[120px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNavigation(
                                Number(passenger.pickup_lat),
                                Number(passenger.pickup_lng),
                                passenger.pickup_address
                              );
                            }}
                          >
                            <NavIcon className="w-3.5 h-3.5" />
                            Navigovať
                          </Button>

                          {passenger.passenger.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-8 px-2.5 text-[11px] sm:text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`tel:${passenger.passenger.phone}`, '_self');
                              }}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              Zavolať
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Map */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-24">
              <Card className="border-0 shadow-card overflow-hidden">
                <CardContent className="p-0">
                  <Map 
                    markers={[...markers, ...gasStations]}
                    showRoute
                    className="h-[260px] sm:h-[360px] lg:h-[500px]"
                    center={selectedPassenger ? [
                      Number(selectedPassenger.pickup_lng),
                      Number(selectedPassenger.pickup_lat)
                    ] : undefined}
                    zoom={selectedPassenger ? 13 : 10}
                  />
                </CardContent>
              </Card>
              
                {selectedPassenger && selectedPassenger.passenger && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Vybraný pasažier:</p>
                  <p className="font-semibold text-sm sm:text-base break-words">{selectedPassenger.passenger.full_name}</p>
                  <p className="text-xs sm:text-sm text-green-600 break-words">📍 Nastúpenie: {selectedPassenger.pickup_address}</p>
                  <p className="text-xs sm:text-sm text-red-500 break-words">🏁 Vystúpenie: {selectedPassenger.dropoff_address || ride?.destination_address || 'Cieľ trasy'}</p>
                  <Button
                    variant="hero"
                    size="sm"
                    className="w-full mt-3 gap-2"
                    onClick={() => openNavigation(
                      Number(selectedPassenger.pickup_lat),
                      Number(selectedPassenger.pickup_lng),
                      selectedPassenger.pickup_address
                    )}
                  >
                    <NavIcon className="w-4 h-4" />
                    Navigovať k nastúpeniu
                  </Button>
                  {selectedPassenger.dropoff_address && selectedPassenger.dropoff_lat && selectedPassenger.dropoff_lng && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 gap-2"
                      onClick={() => openNavigation(
                        Number(selectedPassenger.dropoff_lat),
                        Number(selectedPassenger.dropoff_lng),
                        selectedPassenger.dropoff_address!
                      )}
                    >
                      <NavIcon className="w-4 h-4" />
                      Navigovať k vystúpeniu
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Plávajúca akčná bublina – ďalší krok pre najbližšieho pasažiera */}
      {(() => {
        const priority = (s: string) => (s === 'picked_up' ? 0 : s === 'driver_arrived' ? 1 : s === 'accepted' ? 2 : 3);
        const next = [...passengers]
          .filter(p => p.passenger)
          .sort((a, b) => priority(a.status) - priority(b.status))[0];
        if (!next) return null;

        const name = next.passenger.full_name.split(' ')[0];
        const isPickedUp = next.status === 'picked_up';
        const isArrived = next.status === 'driver_arrived';
        const isAccepted = next.status === 'accepted';

        const label = isPickedUp
          ? `Vysadiť ${name}`
          : isArrived
            ? `Overiť PIN — ${name}`
            : `Som na mieste — ${name}`;
        const Icon = isPickedUp ? LogOut : isArrived ? KeyRound : Bell;
        const bg = isPickedUp
          ? 'bg-blue-600 hover:bg-blue-700'
          : isArrived
            ? 'bg-primary hover:bg-primary/90'
            : 'bg-amber-500 hover:bg-amber-600';

        const onPrimary = () => {
          if (isPickedUp) handleDropoff(next.id, next.passenger.full_name);
          else if (isArrived) setPinDialogFor(next);
          else if (isAccepted) handleArrived(next.id, next.passenger.full_name);
        };

        const navTarget = isPickedUp
          ? { lat: Number(next.dropoff_lat ?? ride?.destination_lat), lng: Number(next.dropoff_lng ?? ride?.destination_lng), addr: next.dropoff_address || ride?.destination_address || '' }
          : { lat: Number(next.pickup_lat), lng: Number(next.pickup_lng), addr: next.pickup_address };

        return (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] max-w-md px-2"
          >
            <div className="rounded-2xl shadow-2xl border border-border bg-card/95 backdrop-blur p-2.5 flex items-center gap-2">
              <Button
                size="lg"
                onClick={onPrimary}
                className={`flex-1 h-14 text-base font-semibold gap-2 text-white ${bg}`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate">{label}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 shrink-0"
                onClick={() => openNavigation(navTarget.lat, navTarget.lng, navTarget.addr)}
                aria-label="Navigovať"
              >
                <NavIcon className="w-5 h-5" />
              </Button>
              {next.passenger.phone && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => window.open(`tel:${next.passenger.phone}`, '_self')}
                  aria-label="Zavolať"
                >
                  <Phone className="w-5 h-5" />
                </Button>
              )}
            </div>
          </motion.div>
        );
      })()}

      {pinDialogFor && (
        <PinEntryDialog
          open={!!pinDialogFor}
          onOpenChange={(o) => { if (!o) setPinDialogFor(null); }}
          requestId={pinDialogFor.id}
          passengerName={pinDialogFor.passenger?.full_name || 'Pasažier'}
          onVerified={() => handlePinVerified(pinDialogFor.id)}
        />
      )}
    </div>
  );
};

export default ManagePassengers;