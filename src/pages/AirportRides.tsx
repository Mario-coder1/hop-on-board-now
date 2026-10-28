import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Plane, Search, Star, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';

export const AIRPORTS = [
  { id: 'vie', name: 'Viedeň (Schwechat)', keywords: ['schwechat', 'flughafen wien', 'vienna airport', 'letisko viedeň', 'letisko vieden'] },
  { id: 'bts', name: 'Bratislava', keywords: ['letisko m. r. štefánika', 'letisko bratislava', 'ivanská cesta', 'bratislava airport'] },
  { id: 'bud', name: 'Budapešť', keywords: ['budapest airport', 'ferenc liszt', 'repülőtér', 'letisko budapešť', 'letisko budapest'] },
  { id: 'kse', name: 'Košice', keywords: ['letisko košice', 'košice airport', 'kosice airport'] },
  { id: 'krk', name: 'Krakov', keywords: ['kraków airport', 'balice', 'lotnisko', 'letisko krakov'] },
  { id: 'prg', name: 'Praha', keywords: ['letiště', 'václava havla', 'prague airport', 'letisko praha'] },
  { id: 'kat', name: 'Katovice', keywords: ['pyrzowice', 'katowice airport', 'letisko katovice'] },
  { id: 'osr', name: 'Ostrava', keywords: ['mošnov', 'letisko ostrava', 'ostrava airport', 'letiště ostrava'] },
  { id: 'brq', name: 'Brno', keywords: ['tuřany', 'letisko brno', 'brno airport', 'letiště brno'] },
  { id: 'tat', name: 'Poprad-Tatry', keywords: ['letisko poprad', 'poprad-tatry', 'poprad airport'] },
  { id: 'waw', name: 'Varšava', keywords: ['letisko varšava', 'chopin', 'warsaw airport'] },
  { id: 'muc', name: 'Mníchov', keywords: ['letisko mníchov', 'munich airport', 'flughafen münchen'] },
] as const;

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  driver: { full_name: string | null; rating: number | null; total_rides: number | null } | null;
}

const matchesAirport = (text: string, keywords: readonly string[]) => {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
};

const AirportRides = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select(`
          id, origin_address, destination_address, departure_time,
          available_seats, price_per_seat,
          driver:public_profiles!rides_driver_id_fkey(full_name, rating, total_rides)
        `)
        .eq('status', 'active')
        .gte('departure_time', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .gt('available_seats', 0)
        .eq('category', 'airport')
        .order('departure_time', { ascending: true })
        .limit(50);
      if (!cancelled) {
        setRides((data as unknown as Ride[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    if (selected === 'all') return rides;
    const a = AIRPORTS.find((x) => x.id === selected);
    if (!a) return rides;
    return rides.filter((r) => matchesAirport(`${r.origin_address} ${r.destination_address}`, a.keywords));
  }, [rides, selected]);

  const faq = [
    { q: 'Ako nájdem spolujazdu na letisko?', a: 'Vyber letisko nižšie a pozri si jazdy, ktoré tam idú alebo odtiaľ prichádzajú. Klikni na jazdu a pošli vodičovi žiadosť.' },
    { q: 'Mám veľký kufor, zmestí sa?', a: 'Pri jazde vidíš, či vodič povoľuje batožinu. Do správy vodičovi napíš, koľko a aké veľké kufre máš.' },
    { q: 'Čo ak meškám na let?', a: 'Rezervuj si jazdu s dostatočnou rezervou. Vodiča vidíš na mape naživo, takže vieš presne, kedy príde.' },
    { q: 'Ako sa platí?', a: 'Cenu za jazdu platíš vodičovi v hotovosti. Online platíš len rezervačný poplatok TakeMe, ktorý sa vráti, ak vodič jazdu zruší alebo ťa nevyzdvihne.' },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <SEO
        title="Spolujazda na letisko Viedeň, Bratislava, Budapešť | TakeMe.sk"
        description="Lacná spolujazda na letisko a z letiska: Viedeň Schwechat, Bratislava, Budapešť, Košice, Krakov, Praha. Overení vodiči, poloha vodiča naživo, hotovosť vodičovi."
        path="/letisko"
        keywords="spolujazda letisko, odvoz na letisko Viedeň, letisko Schwechat spolujazda, letisko Budapešť odvoz, transfer letisko lacno"
        breadcrumbs={[
          { name: 'Domov', path: '/' },
          { name: 'Letisko', path: '/letisko' },
        ]}
        jsonLd={[{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }]}
      />
      <Navigation />

      <div className="container mx-auto px-4 pt-4 pb-6 sm:pt-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5" /> Spolujazda · Letiská
          </p>
          <h1 className="text-[34px] sm:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] mb-3">
            Na letisko<br /><span className="text-muted-foreground">lacno a načas</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Viedeň, Bratislava, Budapešť, Košice, Krakov aj Praha. Pridaj sa k vodičovi, ktorý ide rovnakým smerom, a sleduj ho naživo na mape.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link to="/search"><Button className="rounded-full">Hľadať jazdu</Button></Link>
            <Link to="/create-ride?category=airport"><Button variant="outline" className="rounded-full">Idem na letisko – ponúknem miesto</Button></Link>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" onClick={() => setSelected('all')}>
            <Badge variant={selected === 'all' ? 'default' : 'outline'} className="px-3 py-1.5 cursor-pointer">Všetky letiská</Badge>
          </button>
          {AIRPORTS.map((a) => (
            <button key={a.id} type="button" onClick={() => setSelected(a.id)}>
              <Badge variant={selected === a.id ? 'default' : 'outline'} className="px-3 py-1.5 cursor-pointer">{a.name}</Badge>
            </button>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold tracking-tight mb-3">Jazdy na letisko a z letiska</h2>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="card-mono p-5 h-24 animate-pulse" />)}</div>
          ) : visible.length === 0 ? (
            <div className="card-mono p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" strokeWidth={1.6} />
              </div>
              <h3 className="text-base font-semibold mb-1">Zatiaľ žiadna jazda</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Ideš na letisko autom? Ponúkni voľné miesto. Jazda sa zobrazí len tu v kategórii Letiská.
              </p>
              <Link to="/create-ride?category=airport"><Button size="sm" className="rounded-full">Ponúknuť jazdu</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((ride) => (
                <Link key={ride.id} to={`/ride/${ride.id}`}>
                  <div className="card-mono hover:border-foreground/40 transition-all p-5 cursor-pointer group">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
                        {formatDbDate(ride.departure_time, 'd. MMM · HH:mm', { locale: sk })}
                      </span>
                      <span className="text-2xl font-bold tabular-nums">
                        {ride.price_per_seat}<span className="text-base text-muted-foreground">€</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{ride.origin_address}</div>
                        <div className="font-semibold text-sm truncate text-muted-foreground">→ {ride.destination_address}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">{ride.driver?.full_name || 'Vodič'}</span>
                        <RideBadge totalRides={ride.driver?.total_rides} size="xs" />
                        {ride.driver?.rating && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Star className="w-3 h-3 fill-foreground text-foreground" />
                            <span className="tabular-nums">{Number(ride.driver.rating).toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ride.available_seats}</span>
                        <ArrowRight className="w-4 h-4 text-foreground group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold tracking-tight mb-4">Časté otázky</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="card-mono p-4">
                <h3 className="text-sm font-semibold mb-1">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AirportRides;
