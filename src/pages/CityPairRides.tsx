import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Users, Star, Search } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import {
  CITIES, getCity, distanceKm, estimatedDurationMin, formatDuration,
} from '@/data/cities';
import { sk } from 'date-fns/locale';
import { formatDbDate } from '@/lib/datetime';

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  driver: { full_name: string | null; rating: number | null; avatar_url: string | null } | null;
}

interface CityPairRidesProps {
  fromSlug?: string;
  toSlug?: string;
  variantOverride?: import('@/data/seoVariants').PairVariant;
}

const CityPairRides = ({ fromSlug, toSlug, variantOverride }: CityPairRidesProps = {}) => {
  const params = useParams<{ from?: string; to?: string; slug?: string }>();
  const from = fromSlug ?? params.from;
  const to = toSlug ?? params.to;
  const fromCity = from ? getCity(from) : undefined;
  const toCity = to ? getCity(to) : undefined;

  if (!fromCity || !toCity || from === to) {
    return <Navigate to="/jazdy" replace />;
  }

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const km = useMemo(() => distanceKm(fromCity, toCity), [fromCity, toCity]);
  const minutes = useMemo(() => estimatedDurationMin(km), [km]);
  const duration = formatDuration(minutes);

  // Odhad ceny: ~0.08 €/km, zaokrúhlené na celé €
  const estPrice = Math.max(2, Math.round((km * 0.08) / 0.5) * 0.5);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fromName = fromCity.name.toLowerCase();
      const toName = toCity.name.toLowerCase();
      const { data } = await supabase
        .from('rides')
        .select(`
          id, origin_address, destination_address, departure_time,
          available_seats, price_per_seat, status,
          driver:public_profiles!rides_driver_id_fkey(full_name, rating, avatar_url)
        `)
        .in('status', ['active', 'in_progress'])
        .gt('available_seats', 0)
        .ilike('origin_address', `%${fromName}%`)
        .ilike('destination_address', `%${toName}%`)
        .order('departure_time', { ascending: true })
        .limit(20);
      if (!cancelled) {
        setRides((data as unknown as Ride[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fromCity.slug, toCity.slug]);

  const avgPrice = rides.length
    ? Math.round(rides.reduce((s, r) => s + Number(r.price_per_seat), 0) / rides.length * 10) / 10
    : estPrice;

  const title = variantOverride
    ? `Spolujazda ${fromCity.name} → ${toCity.name} ${variantOverride.titleSuffix} | TakeMe`
    : `Spolujazda ${fromCity.name} → ${toCity.name} | TakeMe`;
  const description = variantOverride
    ? `Spolujazda z ${fromCity.name} do ${toCity.name} ${variantOverride.titleSuffix}. ${variantOverride.descSuffix} ${km} km, cca ${duration}, priemerná cena ${avgPrice} €.`
    : `Nájdi spolujazdu z ${fromCity.name} do ${toCity.name}. ${km} km, cca ${duration}. Aktuálne ${rides.length} jázd, priemerná cena ${avgPrice} €. Lacná a rýchla doprava na trase ${fromCity.name} – ${toCity.name}.`;
  const path = variantOverride
    ? `/jazdy/${fromCity.slug}-${toCity.slug}/${variantOverride.slug}`
    : `/jazdy/${fromCity.slug}-${toCity.slug}`;

  const faq = [
    {
      q: `Aká je vzdialenosť z ${fromCity.name} do ${toCity.name}?`,
      a: `Cestná vzdialenosť medzi mestami ${fromCity.name} a ${toCity.name} je približne ${km} km. Cesta autom trvá zvyčajne ${duration}.`,
    },
    {
      q: `Koľko stojí spolujazda ${fromCity.name} → ${toCity.name}?`,
      a: `Cena za miesto v aute na trase ${fromCity.name} – ${toCity.name} sa pohybuje okolo ${avgPrice} €. Vodiči si určujú cenu sami a často je výrazne nižšia ako vlak alebo autobus.`,
    },
    {
      q: `Ako si rezervujem miesto?`,
      a: `Vyber si jazdu zo zoznamu nižšie, klikni na ňu a pošli vodičovi žiadosť. Po schválení dostaneš push notifikáciu a môžeš sledovať vodiča naživo na mape.`,
    },
    {
      q: `Je spolujazda na TakeMe bezpečná?`,
      a: `Áno. Všetci vodiči sú overení, majú hodnotenia od pasažierov a počas jazdy môžeš sledovať polohu auta v reálnom čase. Pri akomkoľvek probléme nás kontaktuj na support@takeme.sk.`,
    },
  ];

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Carpooling',
      provider: { '@type': 'Organization', name: 'TakeMe', url: 'https://takeme.sk' },
      areaServed: [
        { '@type': 'City', name: fromCity.name },
        { '@type': 'City', name: toCity.name },
      ],
      name: `Spolujazda ${fromCity.name} – ${toCity.name}`,
      description,
      offers: { '@type': 'Offer', price: avgPrice.toFixed(2), priceCurrency: 'EUR' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  // Súvisiace trasy (z toho istého počiatku do iných miest)
  const relatedFrom = CITIES.filter((c) => c.slug !== fromCity.slug && c.slug !== toCity.slug)
    .slice(0, 8);
  const reverse = `/jazdy/${toCity.slug}-${fromCity.slug}`;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <SEO
        title={title}
        description={description}
        path={path}
        jsonLd={jsonLd}
        breadcrumbs={[
          { name: 'Domov', path: '/' },
          { name: 'Jazdy', path: '/jazdy' },
          { name: fromCity.name, path: `/jazdy/${fromCity.slug}` },
          { name: `${fromCity.name} → ${toCity.name}`, path },
        ]}
        keywords={`spolujazda ${fromCity.name} ${toCity.name}, jazdy ${fromCity.name} ${toCity.name}, doprava ${fromCity.name} ${toCity.name}, blablacar ${fromCity.name}, carpooling Slovensko`}
      />
      <Navigation />

      <div className="container mx-auto px-4 pt-4 pb-6 sm:pt-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-4 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Domov</Link>
          <span>›</span>
          <Link to="/jazdy" className="hover:text-foreground">Jazdy</Link>
          <span>›</span>
          <Link to={`/jazdy/${fromCity.slug}`} className="hover:text-foreground">{fromCity.name}</Link>
          <span>›</span>
          <span className="text-foreground">{toCity.name}</span>
        </nav>

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Spolujazda · {fromCity.region}
          </p>
          <h1 className="text-[34px] sm:text-[52px] leading-[0.95] font-bold tracking-[-0.04em] mb-3">
            {fromCity.name} <span className="text-muted-foreground">→</span><br />
            {toCity.name}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Cestuj zdieľaným autom z {fromCity.name} do {toCity.name} lacno, rýchlo a pohodlne. Sleduj vodiča naživo a šetri až 70 % oproti vlaku či autobusu.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-10">
          <div className="card-mono p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vzdialenosť</div>
            <div className="text-2xl font-bold tabular-nums">{km}<span className="text-sm text-muted-foreground ml-1">km</span></div>
          </div>
          <div className="card-mono p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Čas jazdy</div>
            <div className="text-2xl font-bold tabular-nums flex items-baseline gap-1">
              <Clock className="w-4 h-4" />{duration}
            </div>
          </div>
          <div className="card-mono p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Priem. cena</div>
            <div className="text-2xl font-bold tabular-nums">{avgPrice}<span className="text-sm text-muted-foreground ml-1">€</span></div>
          </div>
          <div className="card-mono p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Aktívne jazdy</div>
            <div className="text-2xl font-bold tabular-nums">{rides.length}</div>
          </div>
        </div>

        {/* Popis trasy */}
        <section className="mb-10 prose prose-sm max-w-none">
          <h2 className="text-xl font-bold tracking-tight mb-3">O trase {fromCity.name} – {toCity.name}</h2>
          <p className="text-muted-foreground leading-relaxed">
            Trasa medzi mestami <strong>{fromCity.name}</strong> ({fromCity.region}) a <strong>{toCity.name}</strong> ({toCity.region}) patrí medzi obľúbené smery na slovenských cestách. Vzdialenosť cca <strong>{km} km</strong> prejdeš autom za približne <strong>{duration}</strong>. Spolujazda je najekonomickejší spôsob, ako sa dostať {toCity.nameLocative} – cena za miesto je obvykle <strong>{avgPrice} €</strong>, čo je výrazne menej ako vlak či autobus.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Na TakeMe nájdeš overených vodičov, ktorí pravidelne jazdia z {fromCity.name === 'Bratislava' ? 'Bratislavy' : fromCity.name} {toCity.nameLocative}. Po rezervácii uvidíš polohu vodiča naživo na mape, dostaneš push notifikáciu, keď bude na mieste vyzdvihnutia, a po jazde ho môžeš ohodnotiť.
          </p>
        </section>

        {/* Aktuálne jazdy */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xl font-bold tracking-tight">Aktuálne jazdy</h2>
            <Link to="/search" className="text-xs text-muted-foreground hover:text-foreground">
              Všetky jazdy →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="card-mono p-5 h-24 animate-pulse" />)}
            </div>
          ) : rides.length === 0 ? (
            <div className="card-mono p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" strokeWidth={1.6} />
              </div>
              <h3 className="text-base font-semibold mb-1">Momentálne žiadne jazdy</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Na trase {fromCity.name} – {toCity.name} práve nie sú voľné miesta. Skús to neskôr alebo vytvor vlastnú jazdu ako vodič.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to="/search"><Button variant="outline" size="sm" className="rounded-full">Hľadať</Button></Link>
                <Link to="/create-ride"><Button size="sm" className="rounded-full">Ponúknuť jazdu</Button></Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => {
                const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                return (
                  <Link key={ride.id} to={`/ride/${ride.id}`}>
                    <div className="card-mono hover:border-foreground/40 transition-all p-5 cursor-pointer group">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">{date} · {time}</span>
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
                );
              })}
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold tracking-tight mb-4">Časté otázky</h2>
          <Accordion type="single" collapsible className="card-mono px-4">
            {faq.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Súvisiace trasy */}
        <section className="mb-10">
          <h2 className="text-xl font-bold tracking-tight mb-3">Súvisiace trasy</h2>
          <div className="flex flex-wrap gap-2">
            <Link to={reverse}>
              <Badge variant="outline" className="px-3 py-1.5 hover:bg-foreground hover:text-background cursor-pointer">
                {toCity.name} → {fromCity.name}
              </Badge>
            </Link>
            {relatedFrom.map((c) => (
              <Link key={c.slug} to={`/jazdy/${fromCity.slug}-${c.slug}`}>
                <Badge variant="outline" className="px-3 py-1.5 hover:bg-foreground hover:text-background cursor-pointer">
                  {fromCity.name} → {c.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CityPairRides;
