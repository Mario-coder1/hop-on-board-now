import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Car } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';

interface TopDriver {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: number;
  total_rides: number;
  car_model: string | null;
  badge: string | null;
}

const medalColors = [
  'from-yellow-400 to-amber-500',
  'from-gray-300 to-gray-400',
  'from-amber-600 to-amber-700',
];

const TopDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<TopDriver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopDrivers = async () => {
    const { data } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url, rating, total_rides, car_model, badge')
      .eq('selected_role', 'driver')
      .not('rating', 'is', null)
      .gt('total_rides', 0)
      .order('rating', { ascending: false })
      .order('total_rides', { ascending: false })
      .limit(5);

    if (data) {
      setDrivers(data as TopDriver[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTopDrivers();

    const channel = supabase
      .channel('top-drivers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchTopDrivers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' }, () => {
        fetchTopDrivers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="TOP vodiči"
        description="Najlepšie hodnotení vodiči TakeMe na Slovensku. Pozri si rebríček TOP 5 vodičov podľa hodnotení a počtu jázd."
        path="/top-drivers"
      />
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">TOP 5 Vodičov</h1>
          <p className="text-muted-foreground mt-1">Najlepšie hodnotení vodiči</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : drivers.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Zatiaľ žiadni hodnotení vodiči.</p>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver, index) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden ${index === 0 ? 'border-primary/50 shadow-lg shadow-primary/10' : ''}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    {/* Rank */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${medalColors[index] || 'from-muted to-muted-foreground/20'} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-border">
                      <AvatarImage src={driver.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {driver.full_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{driver.full_name}</p>
                        <RideBadge totalRides={driver.total_rides} size="xs" />
                        {driver.badge && <span className="text-sm">{driver.badge}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {driver.car_model && (
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {driver.car_model}
                          </span>
                        )}
                        <span>{driver.total_rides || 0} jázd</span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <span className="font-bold text-primary">{driver.rating?.toFixed(1) || '–'}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopDrivers;
