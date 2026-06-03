import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, Users, Download, CheckCircle2, MapPin, CreditCard, Bell, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';

import imgHome from '@/assets/tutorial/01-home.png.asset.json';
import imgSearch from '@/assets/tutorial/02-search.png.asset.json';
import imgCreate from '@/assets/tutorial/03-create.png.asset.json';
import imgMyRides from '@/assets/tutorial/04-myrides.png.asset.json';
import imgProfile from '@/assets/tutorial/05-profile.png.asset.json';
import imgWallet from '@/assets/tutorial/06-wallet.png.asset.json';
import imgMyTrips from '@/assets/tutorial/07-mytrips.png.asset.json';

interface Step {
  title: string;
  description: string;
  image: { url: string };
  icon: React.ElementType;
}

const driverSteps: Step[] = [
  {
    title: '1. Prepni sa do role Vodič',
    description:
      'V Profile vyber rolu "Vodič". Na hlavnej obrazovke uvidíš svoje štatistiky — aktívne jazdy, žiadosti, počet jázd a tvoj rating.',
    image: imgProfile,
    icon: Users,
  },
  {
    title: '2. Vytvor novú jazdu',
    description:
      'Klikni na "+ Nová" alebo stredné tlačidlo v navigácii. Štart sa automaticky vyplní z GPS, cieľ a zastávky vyhľadaj cez adresu (max. 5 zastávok).',
    image: imgCreate,
    icon: MapPin,
  },
  {
    title: '3. Nastav typ a podmienky',
    description:
      'Vyber jednorazovú alebo pravidelnú jazdu (s dňami v týždni), počet voľných miest a cenu za miesto. Bez minimálnych/maximálnych limitov.',
    image: imgCreate,
    icon: Car,
  },
  {
    title: '4. Spravuj svoje jazdy',
    description:
      'V sekcii "Jazdy" vidíš všetky aktívne, dokončené a zrušené jazdy. Klikni na jazdu a schváľ alebo zamietni žiadosti pasažierov.',
    image: imgMyRides,
    icon: CheckCircle2,
  },
  {
    title: '5. Počas jazdy — Live tracking',
    description:
      'Zapni "Zdieľať polohu pasažierom" priamo z domovskej obrazovky. Pasažieri ťa uvidia v reálnom čase. Po príchode stlač "Som na mieste" — pasažierovi príde push notifikácia.',
    image: imgHome,
    icon: Bell,
  },
  {
    title: '6. Výplata z peňaženky',
    description:
      'Po dokončení jazdy ti príde 90 % ceny (10 % platforma) do peňaženky. Cez "Požiadať o výplatu" zadáš sumu — admin ti pošle peniaze bankovým prevodom.',
    image: imgWallet,
    icon: CreditCard,
  },
];

const passengerSteps: Step[] = [
  {
    title: '1. Prepni sa do role Pasažier',
    description:
      'V Profile vyber "Pasažier". V Profile si môžeš nahrať aj fotku a nastaviť svoje meno.',
    image: imgProfile,
    icon: Users,
  },
  {
    title: '2. Vyhľadaj jazdu',
    description:
      'Zadaj odkiaľ a kam chceš ísť. Vyhľadávanie zohľadňuje aj zastávky vodičov a živé (prebiehajúce) jazdy s LIVE odznakom.',
    image: imgSearch,
    icon: MapPin,
  },
  {
    title: '3. Aktivuj alerty na trasu',
    description:
      'Klikni na "+ Pridať" alert. Keď niekto vypíše jazdu na tvojej obľúbenej trase, dostaneš push notifikáciu.',
    image: imgSearch,
    icon: Bell,
  },
  {
    title: '4. Pošli žiadosť o jazdu',
    description:
      'V detaile jazdy zadaj presné miesto vyzdvihnutia (GPS alebo vyhľadávanie) a miesto vystúpenia. Zaplať cez Stripe (Apple Pay, Google Pay, karta).',
    image: imgSearch,
    icon: CreditCard,
  },
  {
    title: '5. Sleduj vodiča naživo',
    description:
      'Po schválení vodičom sleduj jeho polohu v reálnom čase. Dostaneš notifikáciu "vodič na mieste". Jazda sa ukončí automaticky pri príchode (< 50 m od cieľa).',
    image: imgMyTrips,
    icon: MapPin,
  },
  {
    title: '6. Ohodnoť vodiča',
    description:
      'Po skončení jazdy ohodnoť vodiča 1–5 hviezdičkami. V sekcii "Moje cesty" si pozrieš históriu, môžeš dať spätnú väzbu alebo nahlásiť problém.',
    image: imgMyTrips,
    icon: Star,
  },
];

const StepCard = ({ step, index }: { step: Step; index: number }) => {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-6 md:p-8 flex flex-col justify-center order-2 md:order-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </div>
          <h3 className="font-display text-xl font-bold mb-2">{step.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
        <div className="bg-muted/40 p-4 md:p-6 flex items-center justify-center order-1 md:order-2">
          <img
            src={step.image.url}
            alt={step.title}
            loading="lazy"
            className="max-h-[420px] w-auto rounded-xl shadow-lg border border-border"
          />
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
        description="Kompletný návod, ako TakeMe používať. Krok za krokom pre vodiča aj pasažiera, vrátane snímok z aplikácie."
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Späť
          </Link>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Ako používať <span className="gradient-text">TakeMe</span>
            </h1>
            <p className="text-muted-foreground">
              Kompletný tutoriál pre vodiča aj pasažiera. Pozri si kroky priamo so snímkami z aplikácie.
            </p>
          </motion.div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'driver' | 'passenger')} className="mb-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="passenger" className="gap-2">
                <Users className="w-4 h-4" /> Pasažier
              </TabsTrigger>
              <TabsTrigger value="driver" className="gap-2">
                <Car className="w-4 h-4" /> Vodič
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-5">
            {steps.map((s, i) => (
              <StepCard key={s.title} step={s} index={i} />
            ))}
          </div>

          {/* Download PDFs */}
          <div className="mt-10 p-6 rounded-2xl bg-card border border-border">
            <h2 className="font-display text-xl font-bold mb-2">Stiahni si tutoriál ako PDF</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pre tlač alebo offline použitie si stiahni návod vo formáte PDF.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href="/tutorials/TakeMe-Tutorial-Pasazier.pdf" target="_blank" rel="noopener">
                  <Download className="w-4 h-4 mr-1" /> PDF pre pasažiera
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/tutorials/TakeMe-Tutorial-Vodic.pdf" target="_blank" rel="noopener">
                  <Download className="w-4 h-4 mr-1" /> PDF pre vodiča
                </a>
              </Button>
            </div>
          </div>
        </div>
        <Navigation />
      </div>
    </>
  );
};

export default Tutorial;
