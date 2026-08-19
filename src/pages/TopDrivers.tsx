import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Car, Route, Calendar, ThumbsUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDbDate } from '@/lib/datetime';

interface TopDriver {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: number;
  total_rides: number;
  car_model: string | null;
  badge: string | null;
}

interface DriverStats {
  total_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  rating: number | null;
  review_count: number;
}

interface DriverReview {
  rating: number;
  comment: string | null;
  created_at: string;
  rater_name: string | null;
  rater_avatar_url: string | null;
}

const medalColors = [
  'from-yellow-400 to-amber-500',
  'from-gray-300 to-gray-400',
  'from-amber-600 to-amber-700',
];

const TopDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<TopDriver[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDriver, setSelectedDriver] = useState<TopDriver | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [reviews, setReviews] = useState<DriverReview[]>([]);

  const fetchTopDrivers = async () => {
    const { data } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url, rating, total_rides, car_model, badge')
      .eq('selected_role', 'driver')
      .not('rating', 'is', null)
      .gt('total_rides', 0)
      .order('rating', { ascending: false })
      .order('total_rides', { ascending: false })
      .limit(10);

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

  const openDetail = async (driver: TopDriver) => {
    setSelectedDriver(driver);
    setDetailOpen(true);
    setDetailLoading(true);

    const [{ data: statsData }, { data: reviewsData }] = await Promise.all([
      supabase.rpc('get_driver_profile_stats', { _driver_id: driver.id }),
      supabase.rpc('get_driver_reviews', { _driver_id: driver.id }),
    ]);

    setStats((statsData as unknown as DriverStats) ?? null);
    setReviews((reviewsData as unknown as DriverReview[]) ?? []);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedDriver(null);
    setStats(null);
    setReviews([]);
  };

  const renderStars = (value: number, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= Math.round(value)
                ? 'text-primary fill-primary'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="TOP vodiči"
        description="Najlepšie hodnotení vodiči TakeMe na Slovensku. Pozri si rebríček TOP 10 vodičov podľa hodnotení a počtu jázd."
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
          <h1 className="text-2xl font-bold">TOP 10 Vodičov</h1>
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
                <Card
                  className={`overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-ring ${
                    index === 0 ? 'border-primary/50 shadow-lg shadow-primary/10' : ''
                  }`}
                  onClick={() => openDetail(driver)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail(driver);
                    }
                  }}
                >
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

      {/* Driver detail modal */}
      <Dialog open={detailOpen} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Profil vodiča</DialogTitle>
            <DialogDescription>Detailné informácie, štatistiky a hodnotenia vybraného vodiča.</DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedDriver ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center shrink-0">
                <button
                  onClick={closeDetail}
                  className="absolute right-4 top-4 rounded-full p-1.5 bg-background/80 hover:bg-background transition-colors"
                  aria-label="Zavrieť"
                >
                  <X className="w-4 h-4" />
                </button>

                <Avatar className="w-24 h-24 border-4 border-background mx-auto shadow-md">
                  <AvatarImage src={selectedDriver.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {selectedDriver.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                <h2 className="text-xl font-bold mt-4">{selectedDriver.full_name}</h2>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <RideBadge totalRides={selectedDriver.total_rides} size="sm" showLabel />
                  {selectedDriver.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {selectedDriver.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 mt-3">
                  {renderStars(stats?.rating ?? selectedDriver.rating, 'md')}
                  <span className="font-bold text-primary">
                    {(stats?.rating ?? selectedDriver.rating)?.toFixed(1) || '–'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({stats?.review_count ?? 0} hodnotení)
                  </span>
                </div>
              </div>

              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <Route className="w-5 h-5 text-primary mb-2" />
                        <p className="text-2xl font-bold">{stats?.total_rides ?? selectedDriver.total_rides}</p>
                        <p className="text-xs text-muted-foreground">Celkovo jázd</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <ThumbsUp className="w-5 h-5 text-primary mb-2" />
                        <p className="text-2xl font-bold">{stats?.completed_rides ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Dokončených</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <Calendar className="w-5 h-5 text-primary mb-2" />
                        <p className="text-2xl font-bold">{stats?.cancelled_rides ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Zrušených</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <Star className="w-5 h-5 text-primary mb-2" />
                        <p className="text-2xl font-bold">{stats?.review_count ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Hodnotení</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Car info */}
                  {selectedDriver.car_model && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Car className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Vozidlo</p>
                          <p className="font-semibold">{selectedDriver.car_model}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Reviews */}
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Hodnotenia</h3>
                    {reviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Tento vodič zatiaľ nemá žiadne komentáre k hodnoteniam.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence>
                          {reviews.map((review, idx) => (
                            <motion.div
                              key={`${review.created_at}-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <Card className="bg-muted/40">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    {renderStars(review.rating, 'sm')}
                                    <span className="text-xs text-muted-foreground">
                                      {formatDbDate(review.created_at, 'dd.MM.yyyy')}
                                    </span>
                                  </div>
                                  {review.comment && (
                                    <p className="text-sm italic">„{review.comment}“</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={review.rater_avatar_url || undefined} />
                                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                        {review.rater_name?.charAt(0).toUpperCase() || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {review.rater_name || 'Anonym'}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Safety actions */}
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-1">Bezpečnosť</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Ak ti niečo nesedí, nahlás vodiča alebo si ho zablokuj. Dôvod si evidujeme.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ReportDialog
                        reportedUserId={selectedDriver.id}
                        reportedUserName={selectedDriver.full_name}
                      />
                      <BlockUserDialog
                        blockedUserId={selectedDriver.id}
                        blockedUserName={selectedDriver.full_name}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopDrivers;
