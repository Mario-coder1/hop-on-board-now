import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, User, Search, PlusCircle, Home, UserCircle, Sparkles, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Role = 'driver' | 'passenger';

interface CoachStep {
  selector: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional route to navigate to before showing this step */
  route?: string;
}

const DONE_KEY = 'takeme_onboarding_tour_v1';

const driverSteps: CoachStep[] = [
  {
    selector: '[data-tour="nav-home"]',
    title: 'Toto je tvoj domov',
    description: 'Tu uvidíš svoje aktívne jazdy, žiadosti od spolujazdcov a rýchle akcie.',
    icon: Home,
    route: '/driver',
  },
  {
    selector: '[data-tour="nav-create"]',
    title: 'Vytvor svoju prvú jazdu',
    description: 'Klikni sem a pridaj trasu, čas a počet miest. Spolujazdci ti pošlú žiadosť.',
    icon: PlusCircle,
  },
  {
    selector: '[data-tour="nav-profile"]',
    title: 'Doplň auto a fotku',
    description: 'V profile pridáš vozidlo, fotku a zapneš upozornenia. Lepší profil = viac jázd.',
    icon: UserCircle,
  },
];

const passengerSteps: CoachStep[] = [
  {
    selector: '[data-tour="nav-home"]',
    title: 'Toto je tvoj domov',
    description: 'Tu uvidíš ponúkané jazdy v tvojom okolí a stav svojich žiadostí.',
    icon: Home,
    route: '/passenger',
  },
  {
    selector: '[data-tour="nav-search"]',
    title: 'Vyhľadaj svoju prvú jazdu',
    description: 'Napíš odkiaľ a kam ideš – ukážeme ti všetkých vodičov, ktorí majú voľné miesta.',
    icon: Search,
  },
  {
    selector: '[data-tour="nav-profile"]',
    title: 'Doplň si profil',
    description: 'Pridaj fotku a zapni upozornenia, aby ťa vodiči rýchlejšie prijali a vedel si o nových jazdách.',
    icon: UserCircle,
  },
];

export function OnboardingTour() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'idle' | 'role' | 'coach' | 'done'>('idle');
  const [role, setRole] = useState<Role | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Decide whether to show
  useEffect(() => {
    if (!profile) return;
    if (phase !== 'idle') return;
    if (localStorage.getItem(DONE_KEY) === profile.id) return;

    // Wait until WelcomeOnboardingDialog finishes (phone step) – it sets its own key
    const welcomeDone = localStorage.getItem('takeme_welcome_onboarded') === profile.id;
    if (!welcomeDone && !profile.phone) return;

    // Small delay to let UI settle
    const t = setTimeout(() => setPhase('role'), 600);
    return () => clearTimeout(t);
  }, [profile, phase]);

  // Compute spotlight rect for current coach step
  const steps = role === 'driver' ? driverSteps : passengerSteps;
  const current = phase === 'coach' ? steps[stepIdx] : null;

  useLayoutEffect(() => {
    if (!current) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(current.selector) as HTMLElement | null;
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [current]);

  const finish = () => {
    if (profile) localStorage.setItem(DONE_KEY, profile.id);
    setPhase('done');
  };

  const handlePickRole = async (pick: Role) => {
    setRole(pick);
    if (profile && profile.selected_role !== pick) {
      await supabase.from('profiles').update({ selected_role: pick }).eq('id', profile.id);
      await refreshProfile();
    }
    // Navigate to role home before starting coachmarks
    const first = (pick === 'driver' ? driverSteps : passengerSteps)[0];
    if (first.route) navigate(first.route);
    setStepIdx(0);
    setTimeout(() => setPhase('coach'), 350);
  };

  const next = () => {
    const list = role === 'driver' ? driverSteps : passengerSteps;
    const nextIdx = stepIdx + 1;
    if (nextIdx >= list.length) {
      finish();
      return;
    }
    const nextStep = list[nextIdx];
    if (nextStep.route) navigate(nextStep.route);
    setStepIdx(nextIdx);
  };

  if (!profile || phase === 'idle' || phase === 'done') return null;

  // ----- Role picker -----
  if (phase === 'role') {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6"
        >
          <button
            onClick={finish}
            aria-label="Zavrieť"
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Vitaj v TakeMe</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Ako budeš appku používať?</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-5">
            Vyber si, či hľadáš odvoz alebo ho ponúkaš. Kedykoľvek to môžeš zmeniť v profile.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handlePickRole('passenger')}
              className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary hover:bg-primary/5 transition text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Hľadám odvoz</div>
                <div className="text-xs text-muted-foreground">Som spolujazdec – chcem nájsť jazdu k svojmu cieľu.</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
            </button>

            <button
              onClick={() => handlePickRole('driver')}
              className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary hover:bg-primary/5 transition text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Ponúkam jazdu</div>
                <div className="text-xs text-muted-foreground">Som vodič – pridám trasu a vezmem so sebou spolujazdcov.</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
            </button>
          </div>

          <button
            onClick={finish}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-5 py-2"
          >
            Preskočiť úvod
          </button>
        </motion.div>
      </div>,
      document.body
    );
  }

  // ----- Coachmark phase -----
  if (phase === 'coach' && current) {
    const list = role === 'driver' ? driverSteps : passengerSteps;
    const isLast = stepIdx === list.length - 1;
    const Icon = current.icon;
    const pad = 10;

    // Position tooltip
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    const isMobile = vw < 768;
    const tooltipMaxW = isMobile ? Math.min(vw - 24, 320) : 320;
    const estimatedH = isMobile ? 210 : 150;
    const gap = isMobile ? 32 : 16;
    let tooltipTop = 0;
    let tooltipLeft = 0;
    let placeAbove = false;

    if (rect) {
      const isBottomNavTarget = isMobile && rect.bottom > vh - 180;
      const spaceAbove = rect.top - gap;
      const spaceBelow = vh - rect.bottom - gap;

      if (isBottomNavTarget) {
        placeAbove = true;
        tooltipTop = Math.max(16, Math.min(96, Math.max(16, rect.top - gap - estimatedH)));
      } else {
        placeAbove = spaceAbove >= estimatedH || spaceAbove > spaceBelow;
        tooltipTop = placeAbove
          ? rect.top - gap - estimatedH
          : rect.bottom + gap;
      }
      tooltipTop = Math.max(16, Math.min(tooltipTop, vh - estimatedH - 16));
      tooltipLeft = rect.left + rect.width / 2 - tooltipMaxW / 2;
      tooltipLeft = Math.max(12, Math.min(tooltipLeft, vw - tooltipMaxW - 12));
    } else {
      tooltipTop = vh / 2 - estimatedH / 2;
      tooltipLeft = vw / 2 - tooltipMaxW / 2;
    }

    return createPortal(
      <AnimatePresence>
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] pointer-events-none"
        >
          {/* SVG mask: dim overlay + spotlight hole */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={next}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect && (
                  <rect
                    x={rect.left - pad}
                    y={rect.top - pad}
                    width={rect.width + pad * 2}
                    height={rect.height + pad * 2}
                    rx={16}
                    ry={16}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
          </svg>

          {/* Highlight ring around the target */}
          {rect && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute rounded-2xl ring-2 ring-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.25)] pointer-events-none"
              style={{
                top: rect.top - pad,
                left: rect.left - pad,
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
              }}
            />
          )}

          {/* Tooltip card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="absolute pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl p-4"
            style={{ top: tooltipTop, left: tooltipLeft, width: tooltipMaxW }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{current.title}</h3>
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {stepIdx + 1} / {list.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{current.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-4">
              <button
                onClick={finish}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Preskočiť
              </button>
              <Button size="sm" onClick={next} className="gap-1">
                {isLast ? 'Hotovo' : 'Ďalej'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  return null;
}
