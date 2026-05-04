import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Hand, Car } from 'lucide-react';

/**
 * Rotating 3-step onboarding shown on the Auth page.
 * Auto-advances every 3.5s with smooth transitions.
 */
const STEPS = [
  {
    icon: PlusCircle,
    title: 'Vytvor jazdu',
    desc: 'Vodič nastaví trasu, čas a počet voľných miest.',
    accent: 'from-primary/30 to-primary/5',
  },
  {
    icon: Hand,
    title: 'Pripoj sa',
    desc: 'Spolujazdec si vyhľadá trasu a požiada o miesto.',
    accent: 'from-accent/30 to-accent/5',
  },
  {
    icon: Car,
    title: 'Cestujte spolu',
    desc: 'Sledujte vodiča naživo a šetrite peniaze aj planétu.',
    accent: 'from-primary/30 to-accent/10',
  },
];

const AuthOnboardingSteps: React.FC = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % STEPS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const Step = STEPS[active];
  const Icon = Step.icon;

  return (
    <div className="w-full">
      <div className="relative h-32 sm:h-36 rounded-2xl border border-primary/15 bg-secondary/40 backdrop-blur-sm overflow-hidden shadow-glass">
        {/* Animated gradient background per step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${active}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 bg-gradient-to-br ${Step.accent}`}
          />
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 h-full flex items-center gap-4 px-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`icon-${active}`}
              initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: 10 }}
              transition={{ duration: 0.4, type: 'spring', damping: 14 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0"
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </motion.div>
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${active}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-widest text-primary/80 uppercase">
                    Krok {active + 1} / {STEPS.length}
                  </span>
                </div>
                <h3 className="font-display font-bold text-base sm:text-lg text-foreground leading-tight">
                  {Step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {Step.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Krok ${i + 1}`}
            className="group h-1.5 rounded-full overflow-hidden bg-primary/15 transition-all"
            style={{ width: i === active ? 28 : 10 }}
          >
            {i === active && (
              <motion.div
                key={`bar-${active}`}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3.5, ease: 'linear' }}
                className="h-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AuthOnboardingSteps;
