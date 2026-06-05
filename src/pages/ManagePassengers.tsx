import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Navigation as NavIcon, Phone, MessageCircle, CheckCircle, MapPin, User, Bell, Radio, LogOut, Flag, KeyRound, Check, X } from 'lucide-react';
import { getStripeEnvironment } from '@/lib/stripe';
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
  passenger_id?: string;
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

const getPassengerPriority = (status: string) =>
  status === 'pending' ? 0 : status === 'picked_up' ? 1 : status === 'driver_arrived' ? 2 : status === 'accepted' ? 3 : 4;

const getPassengerStep = (status: string) =>
  status === 'pending' ? 1 : status === 'accepted' ? 2 : status === 'driver_arrived' ? 3 : status === 'picked_up' ? 4 : 1;

const ManagePassengers = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isTracking, startTracking } = useLocationBroadcast(profile?.id || null);
  
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
        id, passenger_id, status, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, message,
        pin_verified_at, driver_confirmed_at, passenger_confirmed_at,
        passenger:profiles!ride_requests_passenger_id_fkey(id, full_name, phone, avatar_url, rating, total_rides)
      `)
      .eq('ride_id', rideId)
      .in('status', ['pending', 'accepted', 'driver_arrived', 'picked_up']);

    if (passengersData) {
      const visiblePassengers = (passengersData as any[]).map((request) => ({
        ...request,
        passenger: request.passenger || {
          id: request.passenger_id,
          full_name: 'Pasažier',
          phone: null,
          avatar_url: null,
          rating: 5,
          total_rides: null,
        },
      })) as AcceptedPassenger[];
      const nextVisible = [...visiblePassengers]
        .sort((a, b) => getPassengerPriority(a.status) - getPassengerPriority(b.status))[0] || null;
      setPassengers(visiblePassengers);
      setSelectedPassenger((current) => {
        if (current && visiblePassengers.some(p => p.id === current.id)) return current;
        return nextVisible;
      });
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

  const handleAcceptRequest = async (requestId: string, passengerName: string) => {
    const { error } = await supabase.from('ride_requests').update({ status: 'accepted' }).eq('id', requestId);
    if (error) {
      toast({ title: 'Nepodarilo sa prijať', description: error.message, variant: 'destructive' });
      return;
    }
    if (ride && (ride.available_seats ?? 0) > 0) {
      await supabase.from('rides').update({ available_seats: (ride.available_seats ?? 1) - 1 }).eq('id', ride.id);
    }
    toast({ title: 'Žiadosť prijatá', description: `${passengerName} bol pridaný na jazdu.` });
    fetchRideAndPassengers();
  };

  const handleRejectRequest = async (requestId: string, passengerName: string) => {
    const { error } = await supabase.from('ride_requests').update({ status: 'rejected' }).eq('id', requestId);
    if (error) {
      toast({ title: 'Nepodarilo sa odmietnuť', description: error.message, variant: 'destructive' });
      return;
    }
    try {
      await supabase.functions.invoke('refund-ride-payment', {
        body: { request_id: requestId, environment: getStripeEnvironment() },
      });
    } catch (e) {
      console.error('refund error', e);
    }
    toast({ title: 'Žiadosť odmietnutá', description: `${passengerName} bol odmietnutý.` });
    fetchRideAndPassengers();
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
  const nextPassenger = [...passengers]
    .filter(p => p.passenger)
    .sort((a, b) => getPassengerPriority(a.status) - getPassengerPriority(b.status))[0];
  const activePassenger = selectedPassenger || nextPassenger || null;
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
      
      <div className="container mx-auto px-2.5 sm:px-4 py-2 sm:py-8 pb-[7.75rem] md:pb-8 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="self-start h-8 px-2.5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť
            </Button>

            {/* Auto GPS status (no manual toggle) */}
            <div className="flex items-center gap-2">
              {isTracking ? (
                <Badge variant="default" className="gap-1.5 text-[10px] sm:text-xs bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
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

          <h1 className="font-display text-lg sm:text-3xl font-bold mb-0.5 sm:mb-1">Vaši pasažieri</h1>
          <p className="text-xs sm:text-base text-muted-foreground mb-2 sm:mb-4 break-words line-clamp-1 sm:line-clamp-none">
            {ride?.origin_address} → {ride?.destination_address}
          </p>

          {/* Manual complete - subtle */}
          <div className="mb-2 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
            <p className="hidden sm:flex text-xs text-muted-foreground items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
              Jazda sa dokončí automaticky pri dosiahnutí cieľa
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/10 h-8 px-2.5 text-xs ml-auto"
              onClick={handleManualComplete}
              disabled={completing}
            >
              <Flag className="w-3.5 h-3.5" />
              {completing ? 'Dokončujem...' : 'Ukončiť teraz'}
            </Button>
          </div>

          {nextPassenger && (() => {
            const isPending = nextPassenger.status === 'pending';
            const isPickedUp = nextPassenger.status === 'picked_up';
            const isArrived = nextPassenger.status === 'driver_arrived';
            const name = nextPassenger.passenger.full_name.split(' ')[0];
            const target = isPickedUp
              ? {
                  label: 'Cieľ vysadenia',
                  address: nextPassenger.dropoff_address || ride?.destination_address || 'Cieľ trasy',
                  lat: Number(nextPassenger.dropoff_lat ?? ride?.destination_lat),
                  lng: Number(nextPassenger.dropoff_lng ?? ride?.destination_lng),
                }
              : {
                  label: isPending ? 'Žiadosť o nástup' : 'Miesto nástupu',
                  address: nextPassenger.pickup_address,
                  lat: Number(nextPassenger.pickup_lat),
                  lng: Number(nextPassenger.pickup_lng),
                };
            const primaryLabel = isPending ? `Prijať ${name}` : isPickedUp ? `Vysadiť ${name}` : isArrived ? 'Overiť PIN' : 'Som na mieste';
            const PrimaryIcon = isPending ? Check : isPickedUp ? LogOut : isArrived ? KeyRound : Bell;
            const onPrimary = () => {
              if (isPending) handleAcceptRequest(nextPassenger.id, nextPassenger.passenger.full_name);
              else if (isPickedUp) handleDropoff(nextPassenger.id, nextPassenger.passenger.full_name);
              else if (isArrived) setPinDialogFor(nextPassenger);
              else handleArrived(nextPassenger.id, nextPassenger.passenger.full_name);
            };

            return (
              <div className="md:hidden mb-2 rounded-2xl bg-card border border-primary/20 shadow-lg p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Ďalší krok</p>
                    <h2 className="text-base font-bold truncate">{nextPassenger.passenger.full_name}</h2>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-0.5">
                    {getPassengerStep(nextPassenger.status)}/4
                  </Badge>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-muted/60 px-2.5 py-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-none mb-1">{target.label}</p>
                    <p className="text-xs font-medium leading-snug line-clamp-2">{target.address}</p>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_42px_42px] gap-1.5">
                  <Button size="sm" className="h-10 gap-1.5 text-sm font-semibold" onClick={onPrimary}>
                    <PrimaryIcon className="w-4 h-4" />
                    <span className="truncate">{primaryLabel}</span>
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => openNavigation(target.lat, target.lng, target.address)} aria-label="Navigovať">
                    <NavIcon className="w-4 h-4" />
                  </Button>
                  {isPending ? (
                    <Button variant="outline" size="icon" className="h-10 w-10 border-destructive/40 text-destructive" onClick={() => handleRejectRequest(nextPassenger.id, nextPassenger.passenger.full_name)} aria-label="Odmietnuť">
                      <X className="w-4 h-4" />
                    </Button>
                  ) : nextPassenger.passenger.phone ? (
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.open(`tel:${nextPassenger.passenger.phone}`, '_self')} aria-label="Zavolať">
                      <Phone className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="icon" className="h-10 w-10" disabled aria-label="Zavolať">
                      <Phone className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="grid lg:grid-cols-2 gap-2 sm:gap-8">
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
                    <CardContent className="p-2.5 sm:p-5 min-w-0">
                      <div className="flex items-start gap-2.5 sm:gap-4 min-w-0">
                        <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                            <h3 className="font-display font-semibold text-[13px] sm:text-base break-words leading-tight line-clamp-1">
                              {passenger.passenger.full_name}
                            </h3>
                            <RideBadge totalRides={passenger.passenger.total_rides} size="xs" />
                            <Badge 
                              variant={passenger.status === 'picked_up' ? 'default' : 'secondary'} 
                              className={
                                passenger.status === 'picked_up' ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] sm:text-xs px-1.5 py-0' : 
                                passenger.status === 'driver_arrived' ? 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px] sm:text-xs px-1.5 py-0' : 'text-[10px] sm:text-xs px-1.5 py-0'
                              }
                            >
                              {passenger.status === 'picked_up' ? 'Vyzdvihnutý' : 
                               passenger.status === 'driver_arrived' ? 'Na mieste' : 'Čaká'}
                            </Badge>
                          </div>
                          
                          <p className="hidden sm:block text-[11px] sm:text-sm text-muted-foreground mb-1">
                            ⭐ {passenger.passenger.rating?.toFixed(1) || '5.0'}
                          </p>
                          
                          <div className="flex items-start gap-1 text-[11px] sm:text-sm">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground break-words min-w-0 line-clamp-1 sm:line-clamp-none">
                              <span className="font-medium text-foreground">Nastúpenie:</span> {passenger.pickup_address}
                            </span>
                          </div>
                          
                          <div className="flex items-start gap-1 text-[11px] sm:text-sm mt-1">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground break-words min-w-0 line-clamp-1 sm:line-clamp-none">
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

                      {/* Primárna a sekundárne akcie — iba desktop/tablet; na mobile to rieši plávajúca bublina dole */}
                      <div className="mt-3 sm:mt-4 space-y-2 hidden sm:block">
                        {passenger.status === 'accepted' && (
                          <Button
                            size="lg"
                            className="w-full gap-2 h-12 text-sm sm:text-base font-semibold bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-[hsl(var(--warning-foreground))]"
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
                            className="w-full gap-2 h-12 text-sm sm:text-base font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDropoff(passenger.id, passenger.passenger.full_name);
                            }}
                          >
                            <LogOut className="w-5 h-5" />
                            Pasažier vystúpil — ukončiť
                          </Button>
                        )}

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
                    className="h-[136px] min-[390px]:h-[150px] sm:h-[300px] lg:h-[500px]"
                    center={activePassenger ? [
                      Number(activePassenger.pickup_lng),
                      Number(activePassenger.pickup_lat)
                    ] : undefined}
                    zoom={activePassenger ? 13 : 10}
                  />
                </CardContent>
              </Card>
              
                {selectedPassenger && selectedPassenger.passenger && (
                <div className="hidden sm:block mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Vybraný pasažier:</p>
                  <p className="font-semibold text-sm sm:text-base break-words">{selectedPassenger.passenger.full_name}</p>
                  <p className="text-xs sm:text-sm text-primary break-words">📍 Nastúpenie: {selectedPassenger.pickup_address}</p>
                  <p className="text-xs sm:text-sm text-accent break-words">🏁 Vystúpenie: {selectedPassenger.dropoff_address || ride?.destination_address || 'Cieľ trasy'}</p>
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
        const next = nextPassenger;
        if (!next) return null;

        const name = next.passenger.full_name.split(' ')[0];
        const isPending = next.status === 'pending';
        const isPickedUp = next.status === 'picked_up';
        const isArrived = next.status === 'driver_arrived';
        const isAccepted = next.status === 'accepted';

        const label = isPending
          ? `Prijať — ${name}`
          : isPickedUp
            ? `Vysadiť ${name}`
            : isArrived
              ? `Overiť PIN — ${name}`
              : `Som na mieste — ${name}`;
        const Icon = isPending ? Check : isPickedUp ? LogOut : isArrived ? KeyRound : Bell;
        const bg = isPending
          ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]'
          : isPickedUp
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
            : isArrived
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : 'bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-[hsl(var(--warning-foreground))]';

        const onPrimary = () => {
          if (isPending) handleAcceptRequest(next.id, next.passenger.full_name);
          else if (isPickedUp) handleDropoff(next.id, next.passenger.full_name);
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
            className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1rem)] max-w-md bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6"
          >
            <div className="rounded-full shadow-2xl border border-border bg-card/95 backdrop-blur p-1.5 grid grid-cols-[1fr_44px_44px] gap-1.5">
              <Button
                size="sm"
                onClick={onPrimary}
                className={`h-11 px-3 text-sm font-semibold gap-1.5 min-w-0 ${bg}`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{label}</span>
              </Button>
              {isPending ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => handleRejectRequest(next.id, next.passenger.full_name)}
                  aria-label="Odmietnuť"
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => openNavigation(navTarget.lat, navTarget.lng, navTarget.addr)}
                  aria-label="Navigovať"
                >
                  <NavIcon className="w-4 h-4" />
                </Button>
              )}
              {next.passenger.phone ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => window.open(`tel:${next.passenger.phone}`, '_self')}
                  aria-label="Zavolať"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled aria-label="Zavolať">
                  <Phone className="w-4 h-4" />
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