import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Calendar, MapPin, User, Clock, CheckCircle, XCircle, AlertCircle, Navigation as NavigationIcon, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification } from '@/hooks/usePushNotifications';
import { RatingDialog } from '@/components/RatingDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { CancellationDialog } from '@/components/CancellationDialog';
import SEO from '@/components/SEO';
import { getStripeEnvironment } from '@/lib/stripe';
import { buildInvoiceNumber, downloadInvoice } from '@/lib/invoice';

interface Trip {
  id: string;
  status: string;
  pickup_address: string;
  created_at: string;
  ride_id: string;
  payment_status?: string | null;
  amount_paid?: number | null;
  paid_at?: string | null;
  currency?: string | null;
  refunded_at?: string | null;
  ride: {
    id: string;
    origin_address: string;
    destination_address: string;
    departure_time: string;
    price_per_seat: number;
    available_seats: number;
    driver_id: string;
    driver: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

const MyTrips = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingTrip, setCancellingTrip] = useState<Trip | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchTrips();
    } else {
      // Reset loading when there's no profile yet
      setLoading(true);
    }
  }, [profile]);

  // Realtime subscription
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('my-trips-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: `passenger_id=eq.${profile.id}`
        },
        () => {
          console.log('[Realtime] Trip status changed');
          fetchTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:rides(
          id, origin_address, destination_address, departure_time, price_per_seat, available_seats, driver_id,
          driver:public_profiles!rides_driver_id_fkey(full_name, avatar_url)
        )
      `)
      .eq('passenger_id', profile?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MyTrips] fetchTrips error:', error);
      setTrips([]);
      setLoading(false);
      return;
    }

    setTrips((data as unknown as Trip[]) ?? []);
    setLoading(false);
  };

  const handleCancelRequest = async (reason: string) => {
    if (!cancellingTrip || !profile) return;
    setCancelling(true);

    const wasAccepted = cancellingTrip.status === 'accepted' || cancellingTrip.status === 'driver_arrived';
    
    // Update the request with cancellation info
    const { error } = await supabase
      .from('ride_requests')
      .update({ 
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', cancellingTrip.id);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zrušiť žiadosť.',
        variant: 'destructive'
      });
      setCancelling(false);
      return;
    }

    // If was accepted, restore the seat
    if (wasAccepted && cancellingTrip.ride) {
      await supabase
        .from('rides')
        .update({ available_seats: cancellingTrip.ride.available_seats + 1 })
        .eq('id', cancellingTrip.ride_id);
    }

    // Auto-refund the passenger if they paid
    try {
      await supabase.functions.invoke('refund-ride-payment', {
        body: { request_id: cancellingTrip.id, environment: getStripeEnvironment() },
      });
    } catch (e) {
      console.error('refund error', e);
    }

    // Send push notification to driver
    if (cancellingTrip.ride) {
      try {
        const passengerName = profile?.full_name || 'Pasažier';
        await sendPushNotification(
          cancellingTrip.ride.driver_id,
          '❌ Zrušená rezervácia',
          `${passengerName} zrušil rezerváciu. Dôvod: ${reason}`
        );
      } catch (err) {
        console.error('Error sending notification to driver:', err);
      }
    }

    toast({
      title: 'Žiadosť zrušená',
      description: wasAccepted 
        ? 'Vaša rezervácia bola zrušená a miesto bolo uvoľnené.' 
        : 'Vaša žiadosť bola zrušená.',
    });

    setCancelDialogOpen(false);
    setCancellingTrip(null);
    setCancelling(false);
    fetchTrips();
  };

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true;
    return trip.status === filter;
  });

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    accepted: <CheckCircle className="w-4 h-4 text-green-600" />,
    rejected: <XCircle className="w-4 h-4 text-red-600" />,
    picked_up: <AlertCircle className="w-4 h-4 text-blue-600" />,
    completed: <CheckCircle className="w-4 h-4 text-gray-600" />
  };

  const statusLabels: Record<string, string> = {
    pending: 'Čaká na schválenie',
    accepted: 'Schválená',
    rejected: 'Zamietnutá',
    picked_up: 'Vyzdvihnutý',
    completed: 'Dokončená'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    picked_up: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 overflow-x-hidden">
      <SEO title="Moje cesty" description="Prehľad tvojich rezervovaných ciest ako pasažier." path="/my-trips" noindex />
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-5 sm:mb-8 gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Moje cesty</h1>
            <Button variant="hero" size="sm" onClick={() => navigate('/search')} className="shrink-0">
              <Search className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Hľadať jazdu</span>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {(['all', 'pending', 'accepted', 'completed'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className="shrink-0"
              >
                {f === 'all' ? 'Všetky' : 
                 f === 'pending' ? 'Čakajúce' : 
                 f === 'accepted' ? 'Schválené' : 'Dokončené'}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-5 rounded-2xl bg-card border border-border animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-10 sm:p-12 rounded-2xl bg-card border border-border text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">Žiadne cesty</h3>
              <p className="text-muted-foreground mb-6">Nájdite svoju prvú jazdu</p>
              <Button variant="hero" onClick={() => navigate('/search')}>
                Hľadať jazdy
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredTrips.map((trip, index) => {
                const ride = trip.ride;
                const driverName = ride?.driver?.full_name || 'Vodič';
                const time = ride?.departure_time ? formatDbDate(ride.departure_time, 'HH:mm', { locale: sk }) : '—';
                const date = ride?.departure_time ? formatDbDate(ride.departure_time, 'd. MMM', { locale: sk }) : '';
                const canTrack = trip.status === 'accepted' || trip.status === 'picked_up' || trip.status === 'driver_arrived';
                const canCancel = trip.status === 'pending' || trip.status === 'accepted' || trip.status === 'driver_arrived';

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:shadow-md transition-all"
                  >
                    {/* Header: status + date + price */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 ${statusColors[trip.status] ?? ''}`}>
                          {statusIcons[trip.status]}
                          <span className="truncate">{statusLabels[trip.status] ?? trip.status}</span>
                        </div>
                        {date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            {date}
                          </span>
                        )}
                      </div>
                      <span className="text-xl sm:text-2xl font-bold text-primary leading-none shrink-0">{ride?.price_per_seat ?? '—'}€</span>
                    </div>

                    {ride ? (
                      <div className="cursor-pointer" onClick={() => navigate(`/ride/${ride.id}`)}>
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
                            <div className="h-5" />
                            <div className="truncate font-medium text-sm">{ride.destination_address}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                        Táto jazda už nie je dostupná.
                      </div>
                    )}

                    {/* Footer: driver + actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {ride?.driver?.avatar_url ? (
                            <img src={ride.driver.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="font-medium text-xs truncate">{driverName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 justify-end shrink-0">
                        {canTrack && (
                          <Link to={`/track/${trip.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="hero" className="gap-1 h-8 px-2.5">
                              <NavigationIcon className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Sledovať</span>
                            </Button>
                          </Link>
                        )}
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-8 px-2.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancellingTrip(trip);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Zrušiť</span>
                          </Button>
                        )}
                        {trip.status === 'completed' && ride && (
                          <>
                            <RatingDialog
                              rideRequestId={trip.id}
                              ratedUserId={ride.driver_id}
                              ratedUserName={driverName}
                              onRated={fetchTrips}
                            />
                            <ReportDialog
                              reportedUserId={ride.driver_id}
                              reportedUserName={driverName}
                              rideId={ride.id}
                            />
                          </>
                        )}
                        {trip.payment_status === 'paid' && !trip.refunded_at && trip.amount_paid && trip.paid_at && ride && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-8 px-2.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              const paidAt = new Date(trip.paid_at!);
                              downloadInvoice({
                                invoiceNumber: buildInvoiceNumber(trip.id, paidAt),
                                issueDate: paidAt,
                                paidAt,
                                amount: Number(trip.amount_paid),
                                currency: trip.currency || 'eur',
                                passengerName: profile?.full_name || 'Pasažier',
                                driverName: driverName,
                                origin: ride.origin_address,
                                destination: ride.destination_address,
                                rideDate: new Date(ride.departure_time),
                              });
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Potvrdenie</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <CancellationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancelRequest}
        loading={cancelling}
        type="request"
      />
    </div>
  );
};

export default MyTrips;