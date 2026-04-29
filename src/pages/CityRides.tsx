import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { CITIES, getCity, distanceKm, formatDuration, estimatedDurationMin } from '@/data/cities';
import type { CityVariant } from '@/data/seoVariants';

interface CityRidesProps {
  variantOverride?: CityVariant;
}

const CityRides = ({ variantOverride }: CityRidesProps = {}) => {
  const { slug, city } = useParams<{ slug?: string; city?: string }>();
  const key = slug || city;
  const cityObj = key ? getCity(key) : undefined;

  if (!cityObj) return <Navigate to="/jazdy" replace />;

  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select('destination_address')
        .in('status', ['active', 'in_progress'])
        .gt('available_seats', 0)
        .ilike('origin_address', `%${cityObj.name}%`);
      if (cancelled || !data) return;
      const map: Record<string, number> = {};
      for (const r of data as Array<{ destination_address: string }>) {
        for (const c of CITIES) {
          if (c.slug === cityObj.slug) continue;
          if (r.destination_address.toLowerCase().includes(c.name.toLowerCase())) {
            map[c.slug] = (map[c.slug] || 0) + 1;
          }
        }
      }
      setCounts(map);
    })();
    return () => { cancelled = true; };
  }, [cityObj.slug]);

  const others = CITIES.filter((c) => c.slug !== cityObj.slug);
  const baseTitle = `Spolujazda z ${cityObj.name}`;
  const title = variantOverride
    ? `${baseTitle} — ${variantOverride.titleSuffix} | TakeMe`
    : `${baseTitle} | Všetky trasy | TakeMe`;
  const description = variantOverride
    ? `${baseTitle} ${variantOverride.descSuffix} Pozri si všetky aktuálne trasy a ceny.`
    : `Spolujazdy z ${cityObj.name} do celého Slovenska. Pozri si všetky dostupné trasy, ceny a aktuálne jazdy. Cestuj lacno autom z ${cityObj.name}.`;
  const path = variantOverride ? `/jazdy/${cityObj.slug}/${variantOverride.slug}` : `/jazdy/${cityObj.slug}`;

  const faq = [
    {
      q: `Koľko jázd denne odchádza z mesta ${cityObj.name}?`,
      a: `Z mesta ${cityObj.name} pravidelne odchádzajú spolujazdy do všetkých krajských miest na Slovensku. Aktuálny počet voľných jázd vidíš pri každej trase v zozname nižšie — najviac smerov ide do Bratislavy, Košíc a Žiliny.`,
    },
    {
      q: `Ako funguje rezervácia spolujazdy z ${cityObj.name}?`,
      a: `Vyber si trasu, klikni na konkrétnu jazdu a pošli vodičovi žiadosť. Po schválení dostaneš push notifikáciu a počas jazdy môžeš sledovať polohu vodiča naživo na mape.`,
    },
    {
      q: `Koľko stojí spolujazda z ${cityObj.name}?`,
      a: `Cena závisí od vzdialenosti — vodiči si ju určujú sami. Priemerne sa pohybuje okolo 0,07–0,10 € za km, čo je výrazne menej ako autobus alebo vlak.`,
    },
    {
      q: `Môžem ponúknuť vlastnú jazdu z ${cityObj.name}?`,
      a: `Áno. Ak máš auto a voľné miesta, prepni sa v profile na rolu vodiča a vytvor jazdu cez "Nová jazda". Cestujúci ti pošlú žiadosti, ktoré môžeš schváliť alebo odmietnuť.`,
    },
  ];

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      about: { '@type': 'City', name: cityObj.name, address: { '@type': 'PostalAddress', addressRegion: cityObj.region, addressCountry: 'SK' } },
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
          { name: cityObj.name, path },
        ]}
        keywords={`spolujazda ${cityObj.name}, jazdy z ${cityObj.name}, doprava ${cityObj.name}, blablacar ${cityObj.name}`}
      />
      <Navigation />

      <div className="container mx-auto px-4 pt-4 pb-6 sm:pt-8 max-w-5xl">
        <nav className="text-xs text-muted-foreground mb-4 flex gap-1.5" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Domov</Link><span>›</span>
          <Link to="/jazdy" className="hover:text-foreground">Jazdy</Link><span>›</span>
          <span className="text-foreground">{cityObj.name}</span>
        </nav>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {cityObj.region}
          </p>
          <h1 className="text-[34px] sm:text-[52px] leading-[0.95] font-bold tracking-[-0.04em] mb-3">
            Spolujazdy<br /><span className="text-muted-foreground">z {cityObj.name}</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            {cityObj.name} je dôležitý dopravný uzol v {cityObj.region.toLowerCase()}e. Pozri si všetky dostupné trasy zo zoznamu nižšie a nájdi vodiča do ľubovoľného slovenského mesta.
          </p>
        </motion.div>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4">Všetky trasy z {cityObj.name}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {others
              .map((c) => ({ city: c, km: distanceKm(cityObj, c), count: counts[c.slug] || 0 }))
              .sort((a, b) => a.km - b.km)
              .map(({ city: c, km, count }) => (
                <Link key={c.slug} to={`/jazdy/${cityObj.slug}-${c.slug}`}>
                  <div className="card-mono hover:border-foreground/40 transition-all p-4 group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm tracking-tight truncate flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {cityObj.name} → {c.name}
                          {count > 0 && (
                            <Badge className="bg-foreground text-background h-4 px-1.5 text-[9px] rounded-sm">
                              {count}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-1">
                          {km} km · {formatDuration(estimatedDurationMin(km))}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10">
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
      </div>
    </div>
  );
};

export default CityRides;
