import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Calendar, MapPin, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface Trip {
  id: string;
  status: string;
  pickup_address: string;
  created_at: string;
  ride: {
    id: string;
    origin_address: string;
    destination_address: string;
    departure_time: string;
    price_per_seat: number;
    driver: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

const MyTrips = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

  useEffect(() => {
    if (profile) fetchTrips();
  }, [profile]);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:rides(
          id, origin_address, destination_address, departure_time, price_per_seat,
          driver:profiles!rides_driver_id_fkey(full_name, avatar_url)
        )
      `)
      .eq('passenger_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setTrips(data as unknown as Trip[]);
    }
    setLoading(false);
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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-3xl font-bold">Moje cesty</h1>
            <Button variant="hero" onClick={() => navigate('/search')}>
              <Search className="w-4 h-4 mr-2" />
              Hľadať jazdu
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(['all', 'pending', 'accepted', 'completed'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Všetky' : 
                 f === 'pending' ? 'Čakajúce' : 
                 f === 'accepted' ? 'Schválené' : 'Dokončené'}
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
          ) : filteredTrips.length === 0 ? (
            <div className="p-12 rounded-2xl bg-card border border-border text-center">
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
            <div className="space-y-4">
              {filteredTrips.map((trip, index) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/ride/${trip.ride.id}`)}
                  className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColors[trip.status]}`}>
                        {statusIcons[trip.status]}
                        {statusLabels[trip.status]}
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-primary">{trip.ride.price_per_seat}€</span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium">{trip.ride.origin_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="font-medium">{trip.ride.destination_address}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {trip.ride.driver.avatar_url ? (
                          <img src={trip.ride.driver.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <span className="font-medium">{trip.ride.driver.full_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(trip.ride.departure_time), 'd. MMM HH:mm', { locale: sk })}
                    </div>
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

export default MyTrips;