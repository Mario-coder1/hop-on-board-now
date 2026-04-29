import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, MapPin, MoreHorizontal, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';
import { CancellationDialog } from '@/components/CancellationDialog';
import { sendPushNotification } from '@/hooks/usePushNotifications';
import SEO from '@/components/SEO';

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  requests_count: number;
}

const MyRides = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingRide, setCancellingRide] = useState<Ride | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (profile) fetchRides();
  }, [profile]);

  // Realtime subscription
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('my-rides-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${profile.id}`
        },
        () => {
          console.log('[Realtime] Ride updated');
          fetchRides();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        () => {
          console.log('[Realtime] Request updated');
          fetchRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchRides = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        ride_requests(count)
      `)
      .eq('driver_id', profile?.id)
      .order('departure_time', { ascending: false });

    if (data && !error) {
      setRides(data.map(r => ({
        ...r,
        requests_count: r.ride_requests?.[0]?.count || 0
      })) as Ride[]);
    }
    setLoading(false);
  };

  const handleCancelRide = async (reason: string) => {
    if (!cancellingRide || !profile) return;
    setCancelling(true);

    const { error } = await supabase
      .from('rides')
      .update({ 
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: profile.id
      })
      .eq('id', cancellingRide.id);

    if (error) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa zrušiť jazdu.', variant: 'destructive' });
      setCancelling(false);
      return;
    }

    // Notify all accepted passengers
    const { data: requests } = await supabase
      .from('ride_requests')
      .select('passenger_id')
      .eq('ride_id', cancellingRide.id)
      .eq('status', 'accepted');

    if (requests) {
      for (const req of requests) {
        try {
          await sendPushNotification(
            req.passenger_id,
            '❌ Jazda zrušená',
            `Jazda ${cancellingRide.origin_address} → ${cancellingRide.destination_address} bola zrušená. Dôvod: ${reason}`
          );
        } catch (err) {
          console.error('Error notifying passenger:', err);
        }
      }
    }

    toast({ title: 'Jazda zrušená', description: 'Pasažieri boli upozornení.' });
    setCancelDialogOpen(false);
    setCancellingRide(null);
    setCancelling(false);
    fetchRides();
  };

  const filteredRides = rides.filter(ride => {
    if (filter === 'all') return ride.status !== 'cancelled';
    if (filter === 'active') return ride.status === 'active' || ride.status === 'in_progress';
    if (filter === 'cancelled') return ride.status === 'cancelled';
    return ride.status === 'completed';
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const statusLabels: Record<string, string> = {
    active: 'Aktívna',
    in_progress: 'Prebieha',
    completed: 'Dokončená',
    cancelled: 'Zrušená'
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Moje jazdy" description="Prehľad tvojich vytvorených spolujázd ako vodič." path="/my-rides" noindex />
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-3xl font-bold">Moje jazdy</h1>
            <Button variant="hero" onClick={() => navigate('/create-ride')}>
              <Plus className="w-4 h-4 mr-2" />
              Nová jazda
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'active', 'completed', 'cancelled'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Všetky' : f === 'active' ? 'Aktívne' : f === 'completed' ? 'Dokončené' : 'Zrušené'}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-6 rounded-2xl bg-card border border-border animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="p-12 rounded-2xl bg-card border border-border text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">Žiadne jazdy</h3>
              <p className="text-muted-foreground mb-6">Vytvorte svoju prvú jazdu</p>
              <Button variant="hero" onClick={() => navigate('/create-ride')}>
                Vytvoriť jazdu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRides.map((ride, index) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                return (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => navigate(`/ride/${ride.id}`)}
                    className="group relative p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                  >
                    {/* Header row: date + status + menu */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-medium">{date}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[ride.status]}`}>
                          {statusLabels[ride.status]}
                        </span>
                        {ride.requests_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                            {ride.requests_count}
                          </span>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/ride/${ride.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Zobraziť
                            </DropdownMenuItem>
                            {ride.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setCancellingRide(ride);
                                  setCancelDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Zrušiť
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* BlaBlaCar-style route: time | dotted line | addresses */}
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

                    {/* Footer: seats + price */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {ride.available_seats} {ride.available_seats === 1 ? 'miesto' : 'miest'}
                      </span>
                      <span className="text-lg font-bold text-primary">{ride.price_per_seat}€</span>
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
        onConfirm={handleCancelRide}
        loading={cancelling}
        type="ride"
      />
    </div>
  );
};

export default MyRides;