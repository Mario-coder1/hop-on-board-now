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
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

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
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (profile) fetchRides();
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

  const cancelRide = async (rideId: string) => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideId);

    if (!error) {
      toast({ title: 'Jazda zrušená' });
      fetchRides();
    }
  };

  const filteredRides = rides.filter(ride => {
    if (filter === 'all') return true;
    if (filter === 'active') return ride.status === 'active' || ride.status === 'in_progress';
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
          <div className="flex gap-2 mb-6">
            {(['all', 'active', 'completed'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Všetky' : f === 'active' ? 'Aktívne' : 'Dokončené'}
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
              {filteredRides.map((ride, index) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ride.status]}`}>
                          {statusLabels[ride.status]}
                        </span>
                        {ride.requests_count > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {ride.requests_count} žiadostí
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-medium">{ride.origin_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span className="font-medium">{ride.destination_address}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(ride.departure_time), 'd. MMM HH:mm', { locale: sk })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {ride.available_seats} miest
                        </span>
                        <span className="font-medium text-primary">{ride.price_per_seat}€</span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/ride/${ride.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Zobraziť
                        </DropdownMenuItem>
                        {ride.status === 'active' && (
                          <DropdownMenuItem onClick={() => cancelRide(ride.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Zrušiť
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MyRides;