import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Navigation as NavIcon, Phone, CheckCircle, MapPin, User, Bell, Radio, LogOut, Flag, KeyRound, Check, X, Users, MessageCircle, Loader2 } from 'lucide-react';
import { getStripeEnvironment } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
import { parseRoutePolyline } from '@/lib/routeProximity';

import { useGasStations } from '@/hooks/useGasStations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  route_polyline?: string | null;
}

const statusLabel = (s: string) =>
  s === 'pending' ? 'Nová žiadosť'
  : s === 'accepted' ? 'Čaká na nástup'
  : s === 'driver_arrived' ? 'Vodič na mieste'
  : s === 'picked_up' ? 'V aute'
  : s;

const ManagePassengers = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isTracking, startTracking, stopTracking } = useLocationBroadcast(profile?.id || null);

  const [passengers, setPassengers] = useState<AcceptedPassenger[]>([]);
  const [ride, setRide] = useState<RideInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinDialogFor, setPinDialogFor] = useState<AcceptedPassenger | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endingRide, setEndingRide] = useState(false);
  const lastPendingIdsRef = useRef<Set<string>>(new Set());

  // Auto-complete ride at destination
  const { completeRide } = useAutoCompleteRide(
    rideId || null,
    ride ? { lat: Number(ride.destination_lat), lng: Number(ride.destination_lng) } : null,
    profile?.id || null,
    isTracking
  );

  // 🔑 Auto-start location sharing as soon as page mounts
  useEffect(() => {
    if (profile?.id && !isTracking) {
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (rideId && profile) fetchRideAndPassengers();
  }, [rideId, profile]);

  // Realtime
  useEffect(() => {
    if (!rideId) return;
    const channel = supabase
      .channel(`manage-passengers-${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests', filter: `ride_id=eq.${rideId}` },
        () => fetchRideAndPassengers())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        () => fetchRideAndPassengers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  const fetchRideAndPassengers = async () => {
    const { data: rideData } = await supabase.from('rides').select('*').eq('id', rideId).single();
    if (rideData) setRide(rideData as RideInfo);

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
      const list = (passengersData as any[]).map((r) => ({
        ...r,
        passenger: r.passenger || {
          id: r.passenger_id, full_name: 'Pasažier', phone: null, avatar_url: null, rating: 5, total_rides: null,
        },
      })) as AcceptedPassenger[];
      setPassengers(list);

      // Auto-open sheet when a NEW pending request arrives
      const currentPending = new Set(list.filter(p => p.status === 'pending').map(p => p.id));
      const hadBefore = lastPendingIdsRef.current;
      const newOnes = [...currentPending].filter(id => !hadBefore.has(id));
      if (newOnes.length > 0 && hadBefore.size >= 0) {
        // open only if we actually have a brand-new pending after initial load
        if (hadBefore.size > 0 || (lastPendingIdsRef.current === hadBefore && !loading)) {
          setSheetOpen(true);
        }
      }
      lastPendingIdsRef.current = currentPending;
    }
    setLoading(false);
  };

  const maybeActivate = async (requestId: string) => {
    const { data } = await supabase
      .from('ride_requests')
      .select('status, driver_confirmed_at, passenger_confirmed_at, pin_verified_at')
      .eq('id', requestId).maybeSingle();
    if (data && data.pin_verified_at && data.driver_confirmed_at && data.passenger_confirmed_at &&
        data.status !== 'picked_up' && data.status !== 'completed') {
      await supabase.from('ride_requests').update({ status: 'picked_up' }).eq('id', requestId);
    }
  };

  const handlePinVerified = async (requestId: string) => {
    await maybeActivate(requestId);
    fetchRideAndPassengers();
  };

  const handleDropoff = async (requestId: string, passengerName: string) => {
    const { error } = await supabase.from('ride_requests').update({ status: 'completed' }).eq('id', requestId);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' }); return;
    }
    if (ride) {
      await supabase.from('rides').update({ available_seats: (ride.available_seats ?? 0) + 1 }).eq('id', ride.id);
    }
    toast({ title: '✅ Jazda pasažiera dokončená', description: `${passengerName} bol vysadený.` });
    fetchRideAndPassengers();
  };

  const handleArrived = async (requestId: string, passengerName: string) => {
    const { error } = await supabase.from('ride_requests').update({ status: 'driver_arrived' }).eq('id', requestId);
    if (!error) {
      toast({ title: '🔔 Notifikácia odoslaná', description: `${passengerName} bol upozornený.` });
      fetchRideAndPassengers();
    }
  };

  const handleAcceptRequest = async (requestId: string, passengerName: string) => {
    const { error } = await supabase.from('ride_requests').update({ status: 'accepted' }).eq('id', requestId);
    if (error) { toast({ title: 'Chyba', description: error.message, variant: 'destructive' }); return; }
    if (ride && (ride.available_seats ?? 0) > 0) {
      await supabase.from('rides').update({ available_seats: (ride.available_seats ?? 1) - 1 }).eq('id', ride.id);
    }
    toast({ title: '🎉 Prijaté', description: `${passengerName} pridaný.` });
    fetchRideAndPassengers();
  };

  const handleRejectRequest = async (requestId: string, passengerName: string) => {
    const { error } = await supabase.from('ride_requests').update({ status: 'rejected' }).eq('id', requestId);
    if (error) { toast({ title: 'Chyba', description: error.message, variant: 'destructive' }); return; }
    try {
      await supabase.functions.invoke('refund-ride-payment', {
        body: { request_id: requestId, environment: getStripeEnvironment() },
      });
    } catch (e) { console.error('refund', e); }
    toast({ title: 'Žiadosť odmietnutá', description: passengerName });
    fetchRideAndPassengers();
  };

  // Cancel a single passenger (driver-initiated) — refund + free seat
  const handleCancelPassenger = async (requestId: string, passengerName: string) => {
    if (!window.confirm(`Naozaj zrušiť trasu pre ${passengerName}? Pasažierovi budú vrátené peniaze.`)) return;
    const { error } = await supabase.from('ride_requests').update({
      status: 'cancelled',
      cancellation_reason: 'Vodič zrušil pasažiera',
      cancelled_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) { toast({ title: 'Chyba', description: error.message, variant: 'destructive' }); return; }
    if (ride) {
      await supabase.from('rides').update({ available_seats: (ride.available_seats ?? 0) + 1 }).eq('id', ride.id);
    }
    try {
      await supabase.functions.invoke('refund-ride-payment', {
        body: { request_id: requestId, environment: getStripeEnvironment() },
      });
    } catch (e) { console.error('refund', e); }
    toast({ title: 'Pasažier zrušený', description: `${passengerName} bol odstránený a peniaze vrátené.` });
    fetchRideAndPassengers();
  };

  const openNavigation = (lat: number, lng: number) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const url = isIOS ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
              : isAndroid ? `google.navigation:q=${lat},${lng}`
              : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // End the whole ride (driver finishes everything)
  const handleEndRide = async () => {
    if (!ride) return;
    setEndingRide(true);
    try {
      await supabase.from('rides').update({ status: 'completed' }).eq('id', ride.id);
      await supabase.from('ride_requests').update({ status: 'completed' })
        .eq('ride_id', ride.id).in('status', ['accepted', 'driver_arrived', 'picked_up']);
      stopTracking();
      toast({ title: '🏁 Jazda ukončená', description: 'Všetci pasažieri boli upozornení.' });
      navigate('/driver');
    } catch (e: any) {
      toast({ title: 'Chyba', description: e?.message || 'Nepodarilo sa ukončiť.', variant: 'destructive' });
    } finally {
      setEndingRide(false); setEndConfirmOpen(false);
    }
  };

  // Map markers
  const gasStations = useGasStations();
  const markers: any[] = [];
  if (ride) {
    markers.push({ id: 'origin', lat: Number(ride.origin_lat), lng: Number(ride.origin_lng), type: 'origin', popup: ride.origin_address });
    markers.push({ id: 'destination', lat: Number(ride.destination_lat), lng: Number(ride.destination_lng), type: 'destination', popup: ride.destination_address });
  }
  passengers.forEach(p => {
    markers.push({ id: `pickup-${p.id}`, lat: Number(p.pickup_lat), lng: Number(p.pickup_lng), type: 'pickup', popup: `🟢 ${p.passenger.full_name}` });
    if (p.dropoff_lat && p.dropoff_lng) {
      markers.push({ id: `dropoff-${p.id}`, lat: Number(p.dropoff_lat), lng: Number(p.dropoff_lng), type: 'dropoff', popup: `🔴 ${p.passenger.full_name}` });
    }
  });

  const pendingCount = passengers.filter(p => p.status === 'pending').length;
  const totalCount = passengers.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Drive Mode" description="Riadiaci panel vodiča" path="/manage-passengers" noindex />
        <NavigationBar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Drive Mode" description="Riadiaci panel vodiča" path="/manage-passengers" noindex />
      <NavigationBar />

      {/* Compact top bar with inline location toggle */}
      <div className="px-3 pt-2 pb-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/driver')} className="h-9 px-2 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold leading-none">Drive Mode</p>
          <p className="text-xs font-medium truncate">{ride?.origin_address} → {ride?.destination_address}</p>
        </div>
        <Button
          onClick={isTracking ? stopTracking : startTracking}
          size="sm"
          className={`h-9 gap-1.5 rounded-full shrink-0 ${
            isTracking
              ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]'
              : 'bg-muted hover:bg-muted/80 text-foreground'
          }`}
        >
          <span className="relative flex items-center justify-center w-4 h-4">
            <Radio className="w-4 h-4" />
            {isTracking && <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />}
          </span>
          <span className="text-xs">{isTracking ? 'Live' : 'Off'}</span>
        </Button>
      </div>

      {/* Compact map */}
      <div className="px-3 pb-2">
        <div className="h-[28vh] min-h-[180px] max-h-[260px] rounded-2xl overflow-hidden border border-border shadow-card">
          <Map
            markers={[...markers, ...gasStations]}
            showRoute
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Passenger list header — always visible */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm">Pasažieri ({totalCount})</h2>
          {pendingCount > 0 && (
            <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] animate-pulse">
              {pendingCount} nových
            </Badge>
          )}
        </div>
      </div>

      {/* Passenger list — ALWAYS visible, no sheet. Bottom padding leaves room for fixed action bar + mobile nav */}
      <div className="flex-1 overflow-y-auto px-3 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-28 space-y-2.5 min-h-0">
        {passengers.length === 0 ? (
          <div className="text-center py-10">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">Žiadni pasažieri</p>
            <p className="text-sm text-muted-foreground">Čakaj na žiadosti...</p>
          </div>
        ) : (
          [...passengers].sort((a, b) => {
            const order = { pending: 0, picked_up: 1, driver_arrived: 2, accepted: 3 } as any;
            return (order[a.status] ?? 9) - (order[b.status] ?? 9);
          }).map(p => (
            <PassengerCard
              key={p.id}
              p={p}
              rideDest={ride ? { lat: ride.destination_lat, lng: ride.destination_lng, addr: ride.destination_address } : null}
              onAccept={() => handleAcceptRequest(p.id, p.passenger.full_name)}
              onReject={() => handleRejectRequest(p.id, p.passenger.full_name)}
              
              onArrived={() => handleArrived(p.id, p.passenger.full_name)}
              onPin={() => setPinDialogFor(p)}
              onDropoff={() => handleDropoff(p.id, p.passenger.full_name)}
              onNavigate={openNavigation}
            />

          ))
        )}
      </div>

      {/* Fixed bottom action bar — sits above the mobile bottom navigation */}
      <div className="fixed left-0 right-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0 border-t bg-card/95 backdrop-blur p-3 grid grid-cols-1 gap-2 z-40 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.1)]">
        <Button
          onClick={() => setEndConfirmOpen(true)}
          className="gap-1.5 h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs sm:text-sm"
        >
          <Flag className="w-4 h-4" /> Ukončiť jazdu
        </Button>
      </div>


      {/* PIN dialog */}
      {pinDialogFor && (
        <PinEntryDialog
          open={!!pinDialogFor}
          onOpenChange={(o) => { if (!o) setPinDialogFor(null); }}
          requestId={pinDialogFor.id}
          passengerName={pinDialogFor.passenger?.full_name || 'Pasažier'}
          onVerified={() => handlePinVerified(pinDialogFor.id)}
        />
      )}

      {/* End ride confirmation */}
      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ukončiť celú jazdu?</AlertDialogTitle>
            <AlertDialogDescription>
              Všetci aktívni pasažieri budú označení ako dokončení a upozornení. Túto akciu nie je možné vrátiť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingRide}>Späť</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEndRide(); }}
              disabled={endingRide}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {endingRide ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ukončujem...</> : <><Flag className="w-4 h-4 mr-2" /> Áno, ukončiť</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ====== Passenger card ======
const PassengerCard = ({
  p, rideDest, onAccept, onReject, onArrived, onPin, onDropoff, onNavigate,
}: {
  p: AcceptedPassenger;
  rideDest: { lat: number; lng: number; addr: string } | null;
  onAccept: () => void; onReject: () => void;
  onArrived: () => void; onPin: () => void;
  onDropoff: () => void;
  onNavigate: (lat: number, lng: number) => void;
}) => {
  const isPending = p.status === 'pending';
  const isAccepted = p.status === 'accepted';
  const isArrived = p.status === 'driver_arrived';
  const isPickedUp = p.status === 'picked_up';

  const target = isPickedUp
    ? { lat: Number(p.dropoff_lat ?? rideDest?.lat), lng: Number(p.dropoff_lng ?? rideDest?.lng), addr: p.dropoff_address || rideDest?.addr || 'Cieľ' }
    : { lat: Number(p.pickup_lat), lng: Number(p.pickup_lng), addr: p.pickup_address };

  const statusColor =
    isPending ? 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]'
    : isPickedUp ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]'
    : isArrived ? 'bg-primary text-primary-foreground'
    : 'bg-muted text-foreground';

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {p.passenger.avatar_url ? (
            <img src={p.passenger.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-primary">{p.passenger.full_name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{p.passenger.full_name}</h3>
            <RideBadge totalRides={p.passenger.total_rides} size="xs" />
          </div>
          <Badge className={`mt-1 text-[10px] px-1.5 py-0 ${statusColor}`}>{statusLabel(p.status)}</Badge>
        </div>
      </div>

      <div className="space-y-1 mb-2.5 text-xs">
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0"><span className="font-medium">Nástup:</span> <span className="text-muted-foreground line-clamp-1">{p.pickup_address}</span></div>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
          <div className="min-w-0"><span className="font-medium">Výstup:</span> <span className="text-muted-foreground line-clamp-1">{p.dropoff_address || rideDest?.addr || 'Cieľ'}</span></div>
        </div>
        {p.message && (
          <div className="mt-1.5 p-2 rounded-lg bg-muted text-[11px]">
            <MessageCircle className="w-3 h-3 inline mr-1" />{p.message}
          </div>
        )}
      </div>

      {/* Primary action */}
      <div className="grid grid-cols-[1fr_42px_42px] gap-1.5">
        {isPending && (
          <>
            <Button onClick={onAccept} className="h-10 gap-1.5 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))] text-sm font-semibold">
              <Check className="w-4 h-4" /> Prijať
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 border-destructive/40 text-destructive" onClick={onReject}>
              <X className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => onNavigate(target.lat, target.lng)}>
              <NavIcon className="w-4 h-4" />
            </Button>
          </>
        )}
        {isAccepted && (
          <>
            <Button onClick={onArrived} className="h-10 gap-1.5 bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-[hsl(var(--warning-foreground))] text-sm font-semibold">
              <Bell className="w-4 h-4" /> Som na mieste
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => onNavigate(target.lat, target.lng)}>
              <NavIcon className="w-4 h-4" />
            </Button>
            {p.passenger.phone ? (
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.open(`tel:${p.passenger.phone}`, '_self')}>
                <Phone className="w-4 h-4" />
              </Button>
            ) : <Button variant="outline" size="icon" className="h-10 w-10" disabled><Phone className="w-4 h-4" /></Button>}
          </>
        )}
        {isArrived && (
          <>
            <Button onClick={onPin} className="h-10 gap-1.5 text-sm font-semibold">
              <KeyRound className="w-4 h-4" /> Overiť PIN
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => onNavigate(target.lat, target.lng)}>
              <NavIcon className="w-4 h-4" />
            </Button>
            {p.passenger.phone ? (
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.open(`tel:${p.passenger.phone}`, '_self')}>
                <Phone className="w-4 h-4" />
              </Button>
            ) : <Button variant="outline" size="icon" className="h-10 w-10" disabled><Phone className="w-4 h-4" /></Button>}
          </>
        )}
        {isPickedUp && (
          <>
            <Button onClick={onDropoff} className="h-10 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold">
              <LogOut className="w-4 h-4" /> Dokončiť jazdu
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => onNavigate(target.lat, target.lng)}>
              <NavIcon className="w-4 h-4" />
            </Button>
            {p.passenger.phone ? (
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.open(`tel:${p.passenger.phone}`, '_self')}>
                <Phone className="w-4 h-4" />
              </Button>
            ) : <Button variant="outline" size="icon" className="h-10 w-10" disabled><Phone className="w-4 h-4" /></Button>}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagePassengers;
