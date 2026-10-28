import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, ArrowRight, LogIn, UserPlus, Star } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDbDate } from '@/lib/datetime';
import { sk } from 'date-fns/locale';

interface SharedRide {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  driver: {
    full_name: string | null;
    rating: number | null;
    avatar_url: string | null;
    total_rides: number | null;
  } | null;
}

const ShareRide = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [ride, setRide] = useState<SharedRide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ride-share?id=${encodeURIComponent(id)}&format=json`
        );
        const json = res.ok ? await res.json() : null;
        setRide((json?.ride as SharedRide) ?? null);
      } catch {
        setRide(null);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const isBookable =
    ride && ['active', 'in_progress'].includes(ride.status) &&
    new Date(ride.departure_time).getTime() > Date.now() - 15 * 60 * 1000;

  const title = ride
    ? `Spolujazda ${ride.origin_address} → ${ride.destination_address} | TakeMe`
    : 'Spolujazda | TakeMe';
  const description = ride
    ? `Pripoj sa na jazdu ${ride.origin_address} → ${ride.destination_address}. Odchod ${formatDbDate(ride.departure_time, 'd. MMMM o HH:mm', { locale: sk })}, ${Number(ride.price_per_seat).toFixed(2)} € / miesto.`
    : 'Nájdi spolujazdu na TakeMe.sk';

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <SEO title={title} description={description} path={`/j/${id}`} />
      <Navigation />

      <div className="container mx-auto px-4 pt-10 pb-6 max-w-xl">
        {loading || authLoading ? (
          <div className="card-mono p-8 text-center text-muted-foreground">Načítavam jazdu…</div>
        ) : !ride ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-mono p-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Jazda sa nenašla</h1>
            <p className="text-muted-foreground mb-6">
              Táto jazda už bola zmazaná alebo odkaz nie je správny.
            </p>
            <Button asChild className="w-full">
              <Link to="/jazdy">
                Pozrieť aktuálne jazdy
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground text-center">
              Pozvánka na spolujazdu
            </p>

            <div className="card-mono p-6">
              <div className="flex items-start gap-3 mb-5">
                <MapPin className="w-5 h-5 mt-1 shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight leading-tight">
                    {ride.origin_address}
                  </h1>
                  <p className="text-2xl font-bold tracking-tight leading-tight text-muted-foreground">
                    → {ride.destination_address}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {formatDbDate(ride.departure_time, 'd. MMMM', { locale: sk })} o{' '}
                    {formatDbDate(ride.departure_time, 'HH:mm')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{ride.available_seats} voľné miesta</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm">
                  {ride.driver?.avatar_url ? (
                    <img
                      src={ride.driver.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold">{ride.driver?.full_name ?? 'Vodič'}</p>
                    {ride.driver?.rating ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="w-3 h-3" /> {Number(ride.driver.rating).toFixed(1)} ·{' '}
                        {ride.driver.total_rides ?? 0} jázd
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-xl font-bold">{Number(ride.price_per_seat).toFixed(2)} €</p>
              </div>
            </div>

            {!isBookable ? (
              <div className="card-mono p-6 text-center">
                <h2 className="text-lg font-bold mb-2">Táto jazda už skončila</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Pozri si aktuálne jazdy na rovnakej alebo podobnej trase.
                </p>
                <Button asChild className="w-full">
                  <Link to="/jazdy">
                    Pozrieť aktuálne jazdy
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : user ? (
              <Button asChild className="w-full" size="lg">
                <Link to={`/ride/${ride.id}`}>
                  Otvoriť jazdu a rezervovať miesto
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <div className="card-mono p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Na rezerváciu miesta sa prihlás alebo si vytvor účet zadarmo — trvá to menej než minútu.
                </p>
                <Button asChild className="w-full" size="lg">
                  <Link to="/auth">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Vytvoriť účet zadarmo
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Už mám účet — prihlásiť sa
                  </Link>
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              TakeMe.sk — slovenská spolujazda so živým sledovaním vodiča a overenými profilmi.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ShareRide;
