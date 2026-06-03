import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Car,
  Users,
  Download,
  CheckCircle2,
  CreditCard,
  Bell,
  Star,
  Navigation as NavIcon,
  Search,
  Plus,
  Wallet,
  Route,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';

import shotHome from '@/assets/tutorial/01-home.png.asset.json';
import shotSearch from '@/assets/tutorial/02-search.png.asset.json';
import shotCreate from '@/assets/tutorial/03-create.png.asset.json';
import shotMyRides from '@/assets/tutorial/04-myrides.png.asset.json';
import shotProfile from '@/assets/tutorial/05-profile.png.asset.json';
import shotWallet from '@/assets/tutorial/06-wallet.png.asset.json';
import shotMyTrips from '@/assets/tutorial/07-mytrips.png.asset.json';

/* --------------------------- Phone Frame (responsive) --------------------------- */

const PhoneFrame = ({ src, alt }: { src: string; alt: string }) => (
  <div
    className="phone-frame relative mx-auto"
    style={{ width: 'var(--pf-w, 220px)' }}
  >
    <style>{`
      .phone-frame { --pf-w: 210px; --pf-h: 430px; }
      @media (min-width: 400px) { .phone-frame { --pf-w: 230px; --pf-h: 470px; } }
      @media (min-width: 768px) { .phone-frame { --pf-w: 270px; --pf-h: 555px; } }
    `}</style>
    <div className="absolute -inset-3 sm:-inset-4 rounded-[3rem] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl" />
    <div className="relative rounded-[2rem] sm:rounded-[2.2rem] bg-foreground/95 p-[5px] sm:p-[6px] shadow-2xl">
      <div
        className="relative rounded-[1.7rem] sm:rounded-[1.9rem] bg-background overflow-hidden border border-border/50"
        style={{ height: 'var(--pf-h)' }}
      >
        {/* notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-4 sm:h-5 rounded-full bg-foreground/95 z-10" />
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-top"
          draggable={false}
        />
      </div>
    </div>
  </div>
);

/* --------------------------------- Steps --------------------------------- */

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  image: string;
  tag?: string;
}

const driverSteps: Step[] = [
  {
    title: 'Prepni sa do role Vodič',
    description: 'V Profile si v dropdowne vyber rolu „Vodič". Tvoje rozhranie sa prispôsobí — uvidíš ovládanie pre tvorbu a správu jázd.',
    icon: Users,
    tag: 'Profil',
    image: shotProfile.url,
  },
  {
    title: 'Vytvor novú jazdu',
    description: 'Stredným tlačidlom otvor formulár. Štart sa vyplní automaticky z GPS, cieľ a až 5 zastávok pridáš cez vyhľadávanie adresy.',
    icon: Plus,
    tag: 'Nová jazda',
    image: shotCreate.url,
  },
  {
    title: 'Jednorazová alebo pravidelná',
    description: 'Pre opakujúce trasy zvoľ dni v týždni — systém ich automaticky generuje na 7 dní dopredu. Cena a počet miest sú flexibilné.',
    icon: Route,
    tag: 'Plánovanie',
    image: shotCreate.url,
  },
  {
    title: 'Spravuj jazdy a žiadosti',
    description: 'V sekcii Jazdy vidíš aktívne, čakajúce a dokončené. Schvaľuj alebo zamietaj žiadosti pasažierov jedným klikom.',
    icon: CheckCircle2,
    tag: 'Správa',
    image: shotMyRides.url,
  },
  {
    title: 'Live tracking a príchod',
    description: 'Pred jazdou zapni zdieľanie polohy. Pasažier ťa vidí v reálnom čase. Po príchode stlač „Som na mieste" — príde mu push notifikácia.',
    icon: NavIcon,
    tag: 'Počas jazdy',
    image: shotMyTrips.url,
  },
  {
    title: 'Výplata z peňaženky',
    description: '90 % ceny ti automaticky pristane v peňaženke po dokončení jazdy. Cez „Požiadať o výplatu" si peniaze pošleš na účet.',
    icon: Wallet,
    tag: 'Zarábanie',
    image: shotWallet.url,
  },
];

const passengerSteps: Step[] = [
  {
    title: 'Vyber si rolu Pasažier',
    description: 'V Profile prepni rolu. Doplň meno a fotku — vodičom to dáva istotu, koho zoberú do auta.',
    icon: Users,
    tag: 'Profil',
    image: shotProfile.url,
  },
  {
    title: 'Vyhľadaj jazdu',
    description: 'Zadaj odkiaľ a kam. Vyhľadávanie zohľadňuje aj zastávky vodičov a aktuálne prebiehajúce jazdy označené LIVE.',
    icon: Search,
    tag: 'Hľadanie',
    image: shotSearch.url,
  },
  {
    title: 'Nastav alert na trasu',
    description: 'Nenašiel si jazdu? Pridaj si trasu medzi alerty — keď ju niekto vypíše, dostaneš okamžitú push notifikáciu.',
    icon: Bell,
    tag: 'Notifikácie',
    image: shotHome.url,
  },
  {
    title: 'Pošli žiadosť a zaplať',
    description: 'Zadaj presné miesto vyzdvihnutia a vystúpenia. Plať kartou, Apple Pay alebo Google Pay — bezpečne cez Stripe.',
    icon: CreditCard,
    tag: 'Rezervácia',
    image: shotSearch.url,
  },
  {
    title: 'Sleduj vodiča naživo',
    description: 'Po schválení vidíš vodičovu polohu v reálnom čase. Keď je na mieste, dostaneš notifikáciu. Jazda sa ukončí automaticky < 50 m od cieľa.',
    icon: NavIcon,
    tag: 'Počas jazdy',
    image: shotMyTrips.url,
  },
  {
    title: 'Ohodnoť vodiča',
    description: 'Po jazde ohodnoť vodiča 1–5 hviezdičkami. V Mojich cestách máš celú históriu a môžeš nahlásiť prípadný problém.',
    icon: Star,
    tag: 'Po jazde',
    image: shotMyTrips.url,
  },
];

/* --------------------------------- Page --------------------------------- */

const StepCard = ({ step, index, total }: { step: Step; index: number; total: number }) => {
  const Icon = step.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="relative rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-card to-card/40 overflow-hidden group hover:border-primary/40 transition-colors"
    >
      <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-colors" />

      <div className="relative flex flex-col md:grid md:grid-cols-[1.1fr_auto] md:gap-10 md:items-center p-5 sm:p-6 md:p-10">
        <div className="flex items-center justify-between mb-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-cta">
              {index + 1}
            </span>
            {step.tag && (
              <Badge variant="secondary" className="font-medium text-[10px] px-2 py-0.5">
                {step.tag}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {index + 1} / {total}
          </span>
        </div>

        <div className="order-1 md:order-2 flex justify-center md:justify-end mb-5 md:mb-0">
          <PhoneFrame src={step.image} alt={step.title} />
        </div>

        <div className="order-2 md:order-1 space-y-3 md:space-y-4">
          <div className="hidden md:flex items-center gap-3">
            <div className="text-5xl md:text-6xl font-display font-bold text-primary/20 leading-none">
              {String(index + 1).padStart(2, '0')}
            </div>
            {step.tag && (
              <Badge variant="secondary" className="font-medium">
                {step.tag}
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold mb-1.5 sm:mb-2 leading-tight">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-[13px] sm:text-sm md:text-base">
                {step.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const Tutorial = () => {
  const [tab, setTab] = useState<'driver' | 'passenger'>('passenger');
  const steps = tab === 'driver' ? driverSteps : passengerSteps;

  return (
    <>
      <SEO
        title="Tutoriál — Ako používať TakeMe | Vodič a Pasažier"
        description="Profesionálny návod krok za krokom. Vodič aj pasažier — všetko, čo potrebuješ vedieť o TakeMe."
      />
      <div
        className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors min-h-11 py-2 -my-2"
            aria-label="Späť na profil"
          >
            <ArrowLeft className="w-4 h-4" /> Späť na profil
          </Link>

          <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-10"
          >
            <Badge variant="outline" className="mb-3 sm:mb-4 gap-1.5 px-2.5 py-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-primary" />
              Kompletný sprievodca
            </Badge>
            <h1 className="font-display text-[28px] leading-[1.05] sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 tracking-tight">
              Ako používať <span className="gradient-text">TakeMe</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
              Reálne snímky priamo z aplikácie — pre vodiča aj pasažiera.
            </p>
          </motion.header>

          <div
            className="sticky z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 mb-5 sm:mb-8 bg-background/85 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-none sm:static border-b border-border/50 sm:border-0"
            style={{ top: 'env(safe-area-inset-top)' }}
          >
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'driver' | 'passenger')}>
              <TabsList className="grid grid-cols-2 w-full sm:max-w-md h-12 p-1">
                <TabsTrigger value="passenger" className="gap-2 h-full text-sm">
                  <Users className="w-4 h-4" /> Pasažier
                </TabsTrigger>
                <TabsTrigger value="driver" className="gap-2 h-full text-sm">
                  <Car className="w-4 h-4" /> Vodič
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {steps.map((s, i) => (
              <StepCard key={`${tab}-${i}`} step={s} index={i} total={steps.length} />
            ))}
          </div>

          <div className="mt-8 sm:mt-12 p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:contents">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1">
                    Stiahni si tutoriál
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    PDF verzia pre tlač alebo offline použitie.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:ml-auto">
                <Button asChild variant="outline" size="default" className="w-full sm:w-auto">
                  <a href="/tutorials/TakeMe-Tutorial-Pasazier.pdf" target="_blank" rel="noopener">
                    <Download className="w-4 h-4 mr-1.5" /> Pasažier
                  </a>
                </Button>
                <Button asChild size="default" className="w-full sm:w-auto">
                  <a href="/tutorials/TakeMe-Tutorial-Vodic.pdf" target="_blank" rel="noopener">
                    <Download className="w-4 h-4 mr-1.5" /> Vodič
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Navigation />
      </div>
    </>
  );
};

export default Tutorial;
