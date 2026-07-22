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
  Navigation as NavIcon,
  Search,
  Plus,
  Route,
  Sparkles,
  UserCog,
  MapPin,
  Clock,
  Star,
  Wallet,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import p1Home from '@/assets/tutorial-passenger/p1-home.jpeg.asset.json';
import p2Search from '@/assets/tutorial-passenger/p2-search.jpeg.asset.json';
import p3Alert from '@/assets/tutorial-passenger/p3-alert.jpeg.asset.json';
import p4Checkout from '@/assets/tutorial-passenger/p4-checkout.jpeg.asset.json';
import p5Tracking from '@/assets/tutorial-passenger/p5-tracking.jpeg.asset.json';

/* --------------------------- Illustrative Visual --------------------------- */

type Visual =
  | { kind: 'role-switch' }
  | { kind: 'create-form' }
  | { kind: 'recurring' }
  | { kind: 'manage-requests' }
  | { kind: 'live-arrival' }
  | { kind: 'profile-passenger' }
  | { kind: 'search' }
  | { kind: 'alert' }
  | { kind: 'checkout' }
  | { kind: 'live-tracking' };

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div
    className="phone-frame relative mx-auto"
    style={{ width: 'var(--pf-w, 220px)' }}
  >
    <style>{`
      .phone-frame { --pf-w: 220px; --pf-h: 440px; }
      @media (min-width: 400px) { .phone-frame { --pf-w: 240px; --pf-h: 480px; } }
      @media (min-width: 768px) { .phone-frame { --pf-w: 280px; --pf-h: 560px; } }
    `}</style>
    <div className="absolute -inset-3 sm:-inset-4 rounded-[3rem] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl" />
    <div className="relative rounded-[2rem] sm:rounded-[2.2rem] bg-foreground/95 p-[5px] sm:p-[6px] shadow-2xl">
      <div
        className="relative rounded-[1.7rem] sm:rounded-[1.9rem] bg-background overflow-hidden border border-border/50"
        style={{ height: 'var(--pf-h)' }}
      >
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-4 sm:h-5 rounded-full bg-foreground/95 z-10" />
        <div className="absolute inset-0 pt-8 px-3 pb-3 overflow-hidden">{children}</div>
      </div>
    </div>
  </div>
);

const VisualRender = ({ v }: { v: Visual }) => {
  switch (v.kind) {
    case 'role-switch':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-1">Profil</div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/60">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60" />
            <div className="flex-1">
              <div className="h-2 w-16 rounded bg-foreground/70 mb-1" />
              <div className="h-1.5 w-10 rounded bg-muted-foreground/40" />
            </div>
          </div>
          <div className="text-[9px] text-muted-foreground px-1 mt-1">Rola</div>
          <div className="p-2 rounded-lg border border-primary bg-primary/10 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Vodič</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
          </div>
          <div className="p-2 rounded-lg border border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Pasažier</span>
          </div>
        </div>
      );
    case 'create-form':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-1">Nová jazda</div>
          <div className="p-2 rounded-lg bg-muted/60 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <div className="h-2 flex-1 rounded bg-foreground/60" />
          </div>
          <div className="p-2 rounded-lg bg-muted/60 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-destructive" />
            <div className="h-2 flex-1 rounded bg-foreground/40" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/60"><div className="h-2 rounded bg-foreground/40" /></div>
            <div className="p-2 rounded-lg bg-muted/60"><div className="h-2 rounded bg-foreground/40" /></div>
          </div>
          <div className="mt-auto p-2 rounded-lg bg-primary text-center text-[11px] font-semibold text-primary-foreground">
            Zverejniť jazdu
          </div>
        </div>
      );
    case 'recurring':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-1">Pravidelná trasa</div>
          <div className="flex justify-between gap-1">
            {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((d, i) => (
              <div
                key={d}
                className={`flex-1 py-1.5 rounded text-[9px] text-center font-semibold ${
                  i < 5 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 p-2 rounded-lg bg-muted/60 flex items-center gap-2">
            <Clock className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-mono">07:30</span>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
            <Route className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-foreground">Auto-generovanie 7 dní</span>
          </div>
        </div>
      );
    case 'manage-requests':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-1">Žiadosti</div>
          {[0, 1].map((i) => (
            <div key={i} className="p-2 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-muted" />
                <div className="h-2 w-14 rounded bg-foreground/60" />
                <div className="ml-auto text-[9px] font-semibold text-primary">2 mies.</div>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 py-1 rounded bg-primary text-[9px] text-center font-semibold text-primary-foreground">
                  Prijať
                </div>
                <div className="flex-1 py-1 rounded bg-muted text-[9px] text-center font-semibold text-muted-foreground">
                  Zamietnuť
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    case 'live-arrival':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="relative flex-1 rounded-lg bg-gradient-to-br from-primary/20 via-muted to-muted overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(var(--primary)) 0 2px, transparent 2px), radial-gradient(circle at 70% 60%, hsl(var(--primary)) 0 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                <div className="relative w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Car className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-primary text-primary-foreground text-center text-[11px] font-semibold">
            Som na mieste ✓
          </div>
        </div>
      );
    case 'profile-passenger':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="flex flex-col items-center gap-1.5 py-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary" />
            <div className="h-2 w-20 rounded bg-foreground/70" />
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-primary text-primary" />)}
            </div>
          </div>
          <div className="p-2 rounded-lg border border-primary bg-primary/10 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-semibold">Pasažier</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
          </div>
          <div className="p-2 rounded-lg border border-border flex items-center gap-2">
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Vodič</span>
          </div>
        </div>
      );
    case 'search':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="p-2 rounded-lg bg-muted/60 flex items-center gap-2">
            <Search className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-foreground">Bratislava → Košice</span>
          </div>
          {[
            { time: '08:00', price: '15€', live: true },
            { time: '10:30', price: '12€', live: false },
            { time: '14:15', price: '18€', live: false },
          ].map((r, i) => (
            <div key={i} className="p-2 rounded-lg border border-border bg-card/50 flex items-center gap-2">
              <div className="text-[11px] font-mono font-semibold">{r.time}</div>
              <div className="flex-1" />
              {r.live && (
                <span className="px-1.5 py-0.5 rounded bg-destructive text-[8px] font-bold text-destructive-foreground">
                  LIVE
                </span>
              )}
              <div className="text-[11px] font-bold text-primary">{r.price}</div>
            </div>
          ))}
        </div>
      );
    case 'alert':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-1">Alerty na trasu</div>
          <div className="p-2 rounded-lg border border-primary/40 bg-primary/5">
            <div className="flex items-center gap-1.5 mb-1">
              <Bell className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold">Aktívny alert</span>
            </div>
            <div className="text-[10px] text-foreground">Košice → Prešov</div>
          </div>
          <div className="mt-auto p-2 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Bell className="w-3 h-3 text-primary-foreground" />
            </div>
            <div>
              <div className="text-[10px] font-semibold">Nová jazda!</div>
              <div className="text-[9px] text-muted-foreground">Vodič práve vypísal trasu</div>
            </div>
          </div>
        </div>
      );
    case 'checkout':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-1">Rezervácia</div>
          <div className="p-2 rounded-lg bg-muted/60 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-primary" />
            <div className="h-2 flex-1 rounded bg-foreground/50" />
          </div>
          <div className="p-2 rounded-lg bg-muted/60 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-destructive" />
            <div className="h-2 flex-1 rounded bg-foreground/40" />
          </div>
          <div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
            <span className="text-[10px]">Spolu</span>
            <span className="text-[13px] font-bold text-primary">15,00 €</span>
          </div>
          <div className="mt-auto space-y-1.5">
            <div className="p-2 rounded-lg bg-foreground text-background text-center text-[10px] font-semibold flex items-center justify-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Zaplatiť kartou
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="py-1.5 rounded bg-muted text-[9px] font-semibold text-center">Apple Pay</div>
              <div className="py-1.5 rounded bg-muted text-[9px] font-semibold text-center">Google Pay</div>
            </div>
          </div>
        </div>
      );
    case 'live-tracking':
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="relative flex-1 rounded-lg bg-gradient-to-br from-primary/15 via-muted to-muted overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 10 80 Q 40 60 55 45 T 90 15" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeDasharray="3 2" />
            </svg>
            <div className="absolute bottom-3 left-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                <div className="relative w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Car className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            </div>
            <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-destructive border-2 border-background" />
          </div>
          <div className="p-2 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">ETA</span>
              <span className="text-[11px] font-bold text-primary">8 min</span>
            </div>
          </div>
        </div>
      );
  }
};

/* --------------------------------- Steps --------------------------------- */

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  visual: Visual;
  tag?: string;
}

const driverSteps: Step[] = [
  {
    title: 'Prepni sa do role Vodič',
    description: 'V Profile si v dropdowne vyber rolu „Vodič". Tvoje rozhranie sa prispôsobí — uvidíš ovládanie pre tvorbu a správu jázd.',
    icon: UserCog,
    tag: 'Profil',
    visual: { kind: 'role-switch' },
  },
  {
    title: 'Vytvor novú jazdu',
    description: 'Stredným tlačidlom otvor formulár. Štart sa vyplní automaticky z GPS, cieľ a až 5 zastávok pridáš cez vyhľadávanie adresy.',
    icon: Plus,
    tag: 'Nová jazda',
    visual: { kind: 'create-form' },
  },
  {
    title: 'Jednorazová alebo pravidelná',
    description: 'Pre opakujúce trasy zvoľ dni v týždni — systém ich automaticky generuje na 7 dní dopredu. Cena a počet miest sú flexibilné.',
    icon: Route,
    tag: 'Plánovanie',
    visual: { kind: 'recurring' },
  },
  {
    title: 'Spravuj jazdy a žiadosti',
    description: 'V sekcii Jazdy vidíš aktívne, čakajúce a dokončené. Schvaľuj alebo zamietaj žiadosti pasažierov jedným klikom.',
    icon: CheckCircle2,
    tag: 'Správa',
    visual: { kind: 'manage-requests' },
  },
  {
    title: 'Live tracking a príchod',
    description: 'Pred jazdou zapni zdieľanie polohy. Pasažier ťa vidí v reálnom čase. Po príchode stlač „Som na mieste" — príde mu push notifikácia.',
    icon: NavIcon,
    tag: 'Počas jazdy',
    visual: { kind: 'live-arrival' },
  },
];

const passengerSteps: Step[] = [
  {
    title: 'Vyber si rolu Pasažier',
    description: 'V Profile prepni rolu. Doplň meno a fotku — vodičom to dáva istotu, koho zoberú do auta.',
    icon: Users,
    tag: 'Profil',
    visual: { kind: 'profile-passenger' },
  },
  {
    title: 'Vyhľadaj jazdu',
    description: 'Zadaj odkiaľ a kam. Vyhľadávanie zohľadňuje aj zastávky vodičov a aktuálne prebiehajúce jazdy označené LIVE.',
    icon: Search,
    tag: 'Hľadanie',
    visual: { kind: 'search' },
  },
  {
    title: 'Nastav alert na trasu',
    description: 'Nenašiel si jazdu? Pridaj si trasu medzi alerty — keď ju niekto vypíše, dostaneš okamžitú push notifikáciu.',
    icon: Bell,
    tag: 'Notifikácie',
    visual: { kind: 'alert' },
  },
  {
    title: 'Pošli žiadosť a zaplať',
    description: 'Zadaj presné miesto vyzdvihnutia a vystúpenia. Plať kartou, Apple Pay alebo Google Pay — bezpečne cez Stripe.',
    icon: CreditCard,
    tag: 'Rezervácia',
    visual: { kind: 'checkout' },
  },
  {
    title: 'Sleduj vodiča naživo',
    description: 'Po schválení vidíš vodičovu polohu v reálnom čase. Keď je na mieste, dostaneš notifikáciu. Jazda sa ukončí automaticky < 50 m od cieľa.',
    icon: NavIcon,
    tag: 'Počas jazdy',
    visual: { kind: 'live-tracking' },
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
          <PhoneFrame>
            <VisualRender v={step.visual} />
          </PhoneFrame>
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
