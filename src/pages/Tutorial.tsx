import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Car,
  Users,
  Download,
  CheckCircle2,
  MapPin,
  CreditCard,
  Bell,
  Star,
  Navigation as NavIcon,
  Search,
  Plus,
  Wallet,
  Route,
  Clock,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';

/* ----------------------------- Visual Mockups ----------------------------- */
/* Profesionálne ilustrované náhľady postavené z design tokenov.
   Žiadne statické screenshoty — všetko vykreslené naživo. */

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto" style={{ width: 260 }}>
    <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl" />
    <div className="relative rounded-[2.2rem] bg-foreground/95 p-[6px] shadow-2xl">
      <div className="rounded-[1.9rem] bg-background overflow-hidden border border-border/50" style={{ height: 460 }}>
        <div className="h-6 bg-foreground/95 flex items-center justify-center">
          <div className="w-16 h-1 rounded-full bg-background/30" />
        </div>
        <div className="relative h-[calc(100%-1.5rem)] overflow-hidden">{children}</div>
      </div>
    </div>
  </div>
);

const MockHeader = ({ title }: { title: string }) => (
  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60" />
    <div className="text-[11px] font-semibold">{title}</div>
  </div>
);

const MockRoleSwitch = () => (
  <>
    <MockHeader title="Profil" />
    <div className="p-3 space-y-2">
      <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50" />
        <div className="flex-1">
          <div className="h-2 w-20 rounded bg-foreground/80 mb-1" />
          <div className="h-1.5 w-14 rounded bg-muted-foreground/40" />
        </div>
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-1">Rola</div>
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-2.5 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <div className="text-[10px] font-semibold flex-1">Pasažier</div>
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2 opacity-60">
        <Car className="w-4 h-4" />
        <div className="text-[10px] font-semibold flex-1">Vodič</div>
      </div>
    </div>
  </>
);

const MockSearch = () => (
  <>
    <MockHeader title="Hľadať jazdu" />
    <div className="p-3 space-y-2">
      <div className="rounded-xl bg-muted/60 p-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <div className="h-1.5 flex-1 rounded bg-foreground/60" />
      </div>
      <div className="rounded-xl bg-muted/60 p-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-sm bg-rose-500" />
        <div className="h-1.5 flex-1 rounded bg-foreground/60" />
      </div>
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-2 flex items-center justify-center gap-1">
        <Search className="w-3 h-3" />
        <div className="text-[10px] font-semibold">Vyhľadať</div>
      </div>
      <div className="pt-1 space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/50" />
                <div className="h-1.5 w-12 rounded bg-foreground/70" />
              </div>
              {i === 1 && (
                <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <MapPin className="w-2.5 h-2.5 text-primary" />
              <div className="h-1 flex-1 rounded bg-muted-foreground/40" />
              <div className="font-bold text-primary">5€</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

const MockCreate = () => (
  <>
    <MockHeader title="Nová jazda" />
    <div className="p-3 space-y-2">
      <div className="rounded-xl border border-border p-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div className="h-1.5 flex-1 rounded bg-foreground/60" />
          <NavIcon className="w-3 h-3 text-primary" />
        </div>
        <div className="ml-0.5 border-l border-dashed border-border h-3" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-rose-500" />
          <div className="h-1.5 flex-1 rounded bg-foreground/60" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border p-2">
          <div className="text-[8px] text-muted-foreground mb-0.5">Miesta</div>
          <div className="text-sm font-bold">3</div>
        </div>
        <div className="rounded-xl border border-border p-2">
          <div className="text-[8px] text-muted-foreground mb-0.5">Cena</div>
          <div className="text-sm font-bold text-primary">5€</div>
        </div>
      </div>
      <div className="flex gap-1">
        {['Po', 'Ut', 'St', 'Št', 'Pi'].map((d, i) => (
          <div
            key={d}
            className={`flex-1 text-center text-[8px] py-1 rounded-md ${
              i < 3 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-2 text-center text-[10px] font-semibold">
        Vytvoriť jazdu
      </div>
    </div>
  </>
);

const MockLiveTrack = () => (
  <div className="relative h-full">
    {/* fake map */}
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 dark:from-emerald-950/30 dark:via-sky-950/30 dark:to-indigo-950/30" />
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 440" preserveAspectRatio="none">
      <path d="M0 380 Q 80 320 140 280 T 260 140" stroke="hsl(var(--primary))" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M0 380 Q 80 320 140 280 T 260 140" stroke="hsl(var(--primary))" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.2" />
      {/* grid */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 55} x2="260" y2={i * 55} stroke="currentColor" className="text-foreground/5" />
      ))}
    </svg>
    <div className="absolute top-3 left-3 right-3 rounded-xl bg-background/95 backdrop-blur border border-border p-2.5 shadow-lg">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </div>
        <div className="flex-1">
          <div className="h-1.5 w-16 rounded bg-foreground/70 mb-1" />
          <div className="h-1 w-10 rounded bg-muted-foreground/40" />
        </div>
        <div className="text-[10px] font-bold text-primary">5 min</div>
      </div>
    </div>
    {/* driver marker */}
    <div className="absolute" style={{ left: '45%', top: '55%' }}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ width: 24, height: 24 }} />
        <div className="relative w-6 h-6 rounded-full bg-primary border-2 border-background shadow-lg flex items-center justify-center">
          <Car className="w-3 h-3 text-primary-foreground" />
        </div>
      </div>
    </div>
    {/* destination */}
    <div className="absolute" style={{ right: '8%', top: '28%' }}>
      <div className="w-5 h-5 rounded-sm bg-rose-500 border-2 border-background shadow-lg flex items-center justify-center">
        <MapPin className="w-2.5 h-2.5 text-white" />
      </div>
    </div>
    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-background/95 backdrop-blur border border-border p-2 text-center">
      <div className="text-[10px] font-semibold flex items-center justify-center gap-1">
        <NavIcon className="w-3 h-3 text-primary" />
        Vodič na ceste
      </div>
    </div>
  </div>
);

const MockPayment = () => (
  <>
    <MockHeader title="Platba" />
    <div className="p-3 space-y-2.5">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-3">
        <div className="text-[9px] opacity-80 mb-1">Cena za jazdu</div>
        <div className="text-2xl font-bold">5,00 €</div>
        <div className="text-[9px] opacity-80 mt-1">Bratislava → Trnava</div>
      </div>
      <div className="rounded-xl border border-border p-2 flex items-center gap-2">
        <div className="w-8 h-5 rounded bg-foreground" />
        <div className="text-[10px] font-mono">•••• 4242</div>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border p-2 text-center text-[9px] font-semibold">Apple Pay</div>
        <div className="rounded-xl border border-border p-2 text-center text-[9px] font-semibold">Google Pay</div>
      </div>
      <div className="rounded-xl bg-foreground text-background p-2 text-center text-[10px] font-semibold flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" />
        Zaplatiť bezpečne
      </div>
    </div>
  </>
);

const MockRating = () => (
  <>
    <MockHeader title="Ohodnoť jazdu" />
    <div className="p-3 space-y-3">
      <div className="text-center pt-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/50 mb-2" />
        <div className="text-[11px] font-semibold">Ako sa Ti viezlo?</div>
      </div>
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-7 h-7 ${s <= 5 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
      <div className="rounded-xl border border-border p-2 h-14 bg-muted/40" />
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-2 text-center text-[10px] font-semibold">
        Odoslať hodnotenie
      </div>
    </div>
  </>
);

const MockMyRides = () => (
  <>
    <MockHeader title="Moje jazdy" />
    <div className="p-3 space-y-2">
      {[
        { c: 'bg-emerald-500', l: 'Aktívna', n: 2 },
        { c: 'bg-amber-500', l: 'Čakajúce', n: 3 },
        { c: 'bg-muted-foreground', l: 'Dokončené', n: 12 },
      ].map((s) => (
        <div key={s.l} className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2">
          <div className={`w-1 h-8 rounded-full ${s.c}`} />
          <div className="flex-1">
            <div className="text-[10px] font-semibold">{s.l}</div>
            <div className="h-1 w-14 rounded bg-muted-foreground/40 mt-1" />
          </div>
          <div className="text-sm font-bold">{s.n}</div>
        </div>
      ))}
      <div className="rounded-xl border-2 border-dashed border-border p-3 text-center">
        <Plus className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
        <div className="text-[9px] text-muted-foreground">Vytvoriť novú</div>
      </div>
    </div>
  </>
);

const MockWallet = () => (
  <>
    <MockHeader title="Peňaženka" />
    <div className="p-3 space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background p-4">
        <div className="flex items-center justify-between mb-3">
          <Wallet className="w-4 h-4 opacity-80" />
          <div className="text-[8px] opacity-60">TAKEME</div>
        </div>
        <div className="text-[9px] opacity-70 mb-1">Zostatok</div>
        <div className="text-2xl font-bold">127,50 €</div>
      </div>
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-2 text-center text-[10px] font-semibold">
        Požiadať o výplatu
      </div>
      <div className="space-y-1.5">
        {[
          { l: 'Jazda BA → TT', v: '+4,50', pos: true },
          { l: 'Jazda KE → PO', v: '+3,60', pos: true },
          { l: 'Výplata', v: '-50,00', pos: false },
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.pos ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              {t.pos ? <Plus className="w-3 h-3 text-emerald-500" /> : <ArrowLeft className="w-3 h-3 text-rose-500" />}
            </div>
            <div className="flex-1 text-[9px] font-semibold">{t.l}</div>
            <div className={`text-[10px] font-bold ${t.pos ? 'text-emerald-500' : 'text-rose-500'}`}>{t.v} €</div>
          </div>
        ))}
      </div>
    </div>
  </>
);

const MockAlerts = () => (
  <>
    <MockHeader title="Alerty na trasu" />
    <div className="p-3 space-y-2">
      <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-2.5 flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-primary" />
        <div className="text-[10px] font-semibold text-primary">Pridať alert</div>
      </div>
      {[
        { f: 'Bratislava', t: 'Žilina' },
        { f: 'Košice', t: 'Prešov' },
      ].map((a, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Bell className="w-3 h-3 text-primary" />
            <div className="text-[10px] font-semibold flex-1">{a.f} → {a.t}</div>
            <div className="w-6 h-3.5 rounded-full bg-primary p-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-background ml-auto" />
            </div>
          </div>
          <div className="text-[8px] text-muted-foreground">Notifikuj pri novej jazde</div>
        </div>
      ))}
    </div>
  </>
);

const MockArrived = () => (
  <>
    <MockHeader title="Aktívna jazda" />
    <div className="p-3 space-y-2.5">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 flex items-center gap-2">
        <div className="relative">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">LIVE — Vodič na mieste</div>
      </div>
      <div className="rounded-xl border border-border p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[9px]">
          <Clock className="w-2.5 h-2.5 text-muted-foreground" />
          <div className="h-1 flex-1 rounded bg-muted-foreground/30" />
        </div>
        <div className="flex items-center gap-1.5 text-[9px]">
          <MapPin className="w-2.5 h-2.5 text-primary" />
          <div className="h-1 flex-1 rounded bg-muted-foreground/30" />
        </div>
      </div>
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-2.5 text-center text-[10px] font-semibold">
        Som na mieste
      </div>
      <div className="rounded-xl border border-border p-2 text-center text-[10px] font-semibold text-muted-foreground">
        Ukončiť jazdu
      </div>
    </div>
  </>
);

/* --------------------------------- Steps --------------------------------- */

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  mock: React.ReactNode;
  tag?: string;
}

const driverSteps: Step[] = [
  {
    title: 'Prepni sa do role Vodič',
    description: 'V Profile si v dropdowne vyber rolu "Vodič". Tvoje rozhranie sa prispôsobí — uvidíš ovládanie pre tvorbu a správu jázd.',
    icon: Users,
    tag: 'Profil',
    mock: <MockRoleSwitch />,
  },
  {
    title: 'Vytvor novú jazdu',
    description: 'Stredným tlačidlom otvor formulár. Štart sa vyplní automaticky z GPS, cieľ a až 5 zastávok pridáš cez vyhľadávanie adresy.',
    icon: Plus,
    tag: 'Nová jazda',
    mock: <MockCreate />,
  },
  {
    title: 'Jednorazová alebo pravidelná',
    description: 'Pre opakujúce trasy zvoľ dni v týždni — systém ich automaticky generuje na 7 dní dopredu. Cena a počet miest sú flexibilné.',
    icon: Route,
    tag: 'Plánovanie',
    mock: <MockCreate />,
  },
  {
    title: 'Spravuj jazdy a žiadosti',
    description: 'V sekcii Jazdy vidíš aktívne, čakajúce a dokončené. Schvaľuj alebo zamietaj žiadosti pasažierov jedným klikom.',
    icon: CheckCircle2,
    tag: 'Správa',
    mock: <MockMyRides />,
  },
  {
    title: 'Live tracking a príchod',
    description: 'Pred jazdou zapni zdieľanie polohy. Pasažier ťa vidí v reálnom čase. Po príchode stlač "Som na mieste" — príde mu push notifikácia.',
    icon: NavIcon,
    tag: 'Počas jazdy',
    mock: <MockLiveTrack />,
  },
  {
    title: 'Výplata z peňaženky',
    description: '90 % ceny ti automaticky pristane v peňaženke po dokončení jazdy. Cez "Požiadať o výplatu" si peniaze pošleš na účet.',
    icon: Wallet,
    tag: 'Zarábanie',
    mock: <MockWallet />,
  },
];

const passengerSteps: Step[] = [
  {
    title: 'Vyber si rolu Pasažier',
    description: 'V Profile prepni rolu. Doplň meno a fotku — vodičom to dáva istotu, koho zoberú do auta.',
    icon: Users,
    tag: 'Profil',
    mock: <MockRoleSwitch />,
  },
  {
    title: 'Vyhľadaj jazdu',
    description: 'Zadaj odkiaľ a kam. Vyhľadávanie zohľadňuje aj zastávky vodičov a aktuálne prebiehajúce jazdy označené LIVE.',
    icon: Search,
    tag: 'Hľadanie',
    mock: <MockSearch />,
  },
  {
    title: 'Nastav alert na trasu',
    description: 'Nenašiel si jazdu? Pridaj si trasu medzi alerty — keď ju niekto vypíše, dostaneš okamžitú push notifikáciu.',
    icon: Bell,
    tag: 'Notifikácie',
    mock: <MockAlerts />,
  },
  {
    title: 'Pošli žiadosť a zaplať',
    description: 'Zadaj presné miesto vyzdvihnutia a vystúpenia. Plať kartou, Apple Pay alebo Google Pay — bezpečne cez Stripe.',
    icon: CreditCard,
    tag: 'Rezervácia',
    mock: <MockPayment />,
  },
  {
    title: 'Sleduj vodiča naživo',
    description: 'Po schválení vidíš vodičovu polohu v reálnom čase. Keď je na mieste, dostaneš notifikáciu. Jazda sa ukončí automaticky < 50 m od cieľa.',
    icon: NavIcon,
    tag: 'Počas jazdy',
    mock: <MockLiveTrack />,
  },
  {
    title: 'Ohodnoť vodiča',
    description: 'Po jazde ohodnoť vodiča 1–5 hviezdičkami. V Mojich cestách máš celú históriu a môžeš nahlásiť prípadný problém.',
    icon: Star,
    tag: 'Po jazde',
    mock: <MockRating />,
  },
];

/* --------------------------------- Page --------------------------------- */

const StepCard = ({ step, index }: { step: Step; index: number }) => {
  const Icon = step.icon;
  const reverse = index % 2 === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="relative rounded-3xl border border-border/60 bg-gradient-to-br from-card to-card/40 overflow-hidden group hover:border-primary/40 transition-colors"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
      <div className={`relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 p-6 md:p-10 items-center ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-5xl md:text-6xl font-display font-bold text-primary/20 leading-none">
              {String(index + 1).padStart(2, '0')}
            </div>
            {step.tag && (
              <Badge variant="secondary" className="ml-2 font-medium">
                {step.tag}
              </Badge>
            )}
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl md:text-2xl font-bold mb-2 leading-tight">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{step.description}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center py-2">
          <PhoneFrame>{step.mock}</PhoneFrame>
        </div>
      </div>
    </motion.div>
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
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-32">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Späť na profil
          </Link>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center md:text-left"
          >
            <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1">
              <Sparkles className="w-3 h-3 text-primary" />
              Kompletný sprievodca
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 tracking-tight">
              Ako používať <span className="gradient-text">TakeMe</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
              Všetko, čo potrebuješ vedieť. Šesť krokov, jasne a profesionálne — pre vodiča aj pasažiera.
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'driver' | 'passenger')} className="mb-8">
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto md:mx-0 h-12 p-1">
              <TabsTrigger value="passenger" className="gap-2 h-full">
                <Users className="w-4 h-4" /> Pasažier
              </TabsTrigger>
              <TabsTrigger value="driver" className="gap-2 h-full">
                <Car className="w-4 h-4" /> Vodič
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((s, i) => (
              <StepCard key={`${tab}-${i}`} step={s} index={i} />
            ))}
          </div>

          {/* Download PDFs */}
          <div className="mt-12 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-border">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl md:text-2xl font-bold mb-1">Stiahni si tutoriál</h2>
                <p className="text-sm text-muted-foreground">
                  PDF verzia pre tlač alebo offline použitie.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="/tutorials/TakeMe-Tutorial-Pasazier.pdf" target="_blank" rel="noopener">
                    <Download className="w-4 h-4 mr-1.5" /> Pasažier
                  </a>
                </Button>
                <Button asChild size="sm">
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
