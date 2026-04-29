import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { CITIES } from '@/data/cities';

const RidesIndex = () => {
  // Top 8 najobľúbenejších párov manuálne (najväčšie mestá)
  const popularPairs: Array<[string, string]> = [
    ['bratislava', 'kosice'],
    ['bratislava', 'zilina'],
    ['bratislava', 'banska-bystrica'],
    ['bratislava', 'nitra'],
    ['bratislava', 'trnava'],
    ['kosice', 'presov'],
    ['kosice', 'poprad'],
    ['zilina', 'martin'],
    ['bratislava', 'trencin'],
    ['kosice', 'bratislava'],
    ['presov', 'bratislava'],
    ['banska-bystrica', 'zvolen'],
  ];

  const slugToName = Object.fromEntries(CITIES.map(c => [c.slug, c.name]));

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <SEO
        title="Jazdy a spolujazda na Slovensku | Všetky trasy | TakeMe"
        description="Prehľad všetkých trás spolujazdy na Slovensku. Bratislava, Košice, Žilina, Prešov a všetky krajské mestá. Nájdi vodiča alebo ponúkni miesto v aute."
        path="/jazdy"
        keywords="spolujazda Slovensko, jazdy autom, blablacar, carpooling SK, lacná doprava"
        breadcrumbs={[
          { name: 'Domov', path: '/' },
          { name: 'Jazdy', path: '/jazdy' },
        ]}
      />
      <Navigation />

      <div className="container mx-auto px-4 pt-4 pb-6 sm:pt-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Spolujazda · Slovensko</p>
          <h1 className="text-[34px] sm:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] mb-3">
            Všetky trasy<br /><span className="text-muted-foreground">na Slovensku</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Prezri si populárne smery, alebo si vyber konkrétne mesto a nájdi všetky odjazdy. Spolujazda lacno, rýchlo a so živým sledovaním vodiča.
          </p>
        </motion.div>

        <section className="mb-10">
          <h2 className="text-xl font-bold tracking-tight mb-4">Najobľúbenejšie trasy</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularPairs.map(([from, to]) => (
              <Link key={`${from}-${to}`} to={`/jazdy/${from}-${to}`}>
                <div className="card-mono hover:border-foreground/40 transition-all p-4 group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm tracking-tight flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{slugToName[from]} → {slugToName[to]}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4">Všetky mestá</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CITIES.map((c) => (
              <Link key={c.slug} to={`/jazdy/${c.slug}`}>
                <div className="card-mono hover:border-foreground/40 transition-all px-3 py-2.5 group flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{c.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RidesIndex;
