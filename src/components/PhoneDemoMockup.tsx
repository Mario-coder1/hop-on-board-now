import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Star,
  Navigation,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";

/**
 * Animated phone mockup that cycles through 4 screens of the TakeMe app.
 * Loops infinitely — acts as a "live video demo" of the app for the hero.
 */
const SCREEN_DURATION = 3200; // ms per screen
const SCREENS = ["search", "results", "tracking", "done"] as const;
type Screen = (typeof SCREENS)[number];

export default function PhoneDemoMockup() {
  const [screenIdx, setScreenIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setScreenIdx((i) => (i + 1) % SCREENS.length);
    }, SCREEN_DURATION);
    return () => clearInterval(id);
  }, []);

  const current: Screen = SCREENS[screenIdx];

  return (
    <div className="relative mx-auto flex items-center justify-center">
      {/* Glow behind phone */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.6), transparent 60%)",
        }}
      />

      {/* Phone frame */}
      <div className="relative w-[260px] h-[540px] rounded-[44px] bg-neutral-900 p-[10px] shadow-2xl ring-1 ring-black/10">
        {/* Notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[14px] w-24 h-6 bg-neutral-900 rounded-full z-20" />
        {/* Screen */}
        <div className="relative w-full h-full rounded-[36px] overflow-hidden bg-gradient-to-b from-background to-muted">
          {/* Status bar */}
          <div className="absolute top-0 inset-x-0 h-9 flex items-center justify-between px-6 text-[10px] font-medium text-foreground/70 z-10">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1.5 rounded-sm bg-foreground/60" />
              <span className="w-1 h-1 rounded-full bg-foreground/60" />
              <span className="w-3 h-1.5 rounded-sm bg-foreground/60" />
            </span>
          </div>

          {/* Screen content */}
          <div className="absolute inset-0 pt-9">
            <AnimatePresence mode="wait">
              {current === "search" && <SearchScreen key="search" />}
              {current === "results" && <ResultsScreen key="results" />}
              {current === "tracking" && <TrackingScreen key="tracking" />}
              {current === "done" && <DoneScreen key="done" />}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Screen progress dots */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SCREENS.map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === screenIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Screens ─────────────────────────────────────────────────────── */

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function SearchScreen() {
  return (
    <motion.div {...fadeSlide} className="px-4 pt-2 space-y-3">
      <div className="text-[15px] font-semibold">Kam ideš?</div>

      {/* From input */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-border shadow-sm"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[12px] font-medium">Bratislava</span>
      </motion.div>

      {/* To input with typing animation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-border shadow-sm"
      >
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <motion.span
          className="text-[12px] font-medium"
          initial={{ width: 0 }}
          animate={{ width: "auto" }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Trnava
        </motion.span>
        <motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ delay: 0.6, duration: 0.8, repeat: 2 }}
          className="w-0.5 h-3 bg-primary"
        />
      </motion.div>

      {/* Search button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="w-full mt-2 h-10 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-md"
      >
        <Search className="w-3.5 h-3.5" />
        Hľadať jazdy
      </motion.button>

      {/* Suggestions */}
      <div className="pt-2 space-y-1.5">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
          Populárne
        </div>
        {["BA → Košice · od 15 €", "BA → Žilina · od 9 €"].map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 + i * 0.15 }}
            className="text-[11px] text-muted-foreground py-1.5 px-2 rounded-lg bg-white/40 dark:bg-white/[0.03]"
          >
            {s}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ResultsScreen() {
  const rides = [
    { name: "Peter K.", rating: 4.9, price: "5 €", time: "8:30" },
    { name: "Mária S.", rating: 4.8, price: "6 €", time: "10:15" },
    { name: "Ján V.", rating: 5.0, price: "5 €", time: "14:00" },
  ];

  return (
    <motion.div {...fadeSlide} className="px-4 pt-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">BA → Trnava</div>
        <div className="text-[10px] text-muted-foreground">3 jazdy dnes</div>
      </div>

      {rides.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.12 }}
          className="p-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-border shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {r.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate">{r.name}</div>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                {r.rating}
                <span className="mx-1">·</span>
                <Clock className="w-2.5 h-2.5" />
                {r.time}
              </div>
            </div>
            <div className="text-[13px] font-bold text-primary">{r.price}</div>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: [0.95, 1.05, 1], opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="mt-2 py-1.5 px-2 rounded-lg bg-primary/10 border border-primary/30 text-[10px] text-primary text-center font-medium"
      >
        ✓ Rezervované – 5 €
      </motion.div>
    </motion.div>
  );
}

function TrackingScreen() {
  return (
    <motion.div {...fadeSlide} className="relative h-full">
      {/* Fake map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-sky-100 to-blue-100 dark:from-emerald-900/30 dark:via-sky-900/30 dark:to-blue-900/30">
        {/* Roads */}
        <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 260 500" preserveAspectRatio="none">
          <path d="M 20 100 Q 130 150 240 200 T 40 380" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          <path d="M 0 250 L 260 260" stroke="hsl(var(--foreground))" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M 130 0 L 140 500" stroke="hsl(var(--foreground))" strokeWidth="1" fill="none" opacity="0.3" />
        </svg>
        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 500" preserveAspectRatio="none">
          <motion.path
            d="M 40 380 Q 130 300 200 200 T 220 80"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* Start & end pins */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="absolute bottom-[24%] left-[13%]"
      >
        <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-500/30" />
      </motion.div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="absolute top-[15%] right-[13%]"
      >
        <MapPin className="w-5 h-5 text-red-500 fill-red-500" />
      </motion.div>

      {/* Moving car */}
      <motion.div
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "70%" }}
        transition={{ delay: 1, duration: 2, ease: "easeInOut" }}
        className="absolute w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-4 ring-primary/30"
        style={{
          offsetPath:
            "path('M 40 380 Q 130 300 200 200 T 220 80')",
          left: 0,
          top: 0,
        }}
      >
        <Navigation className="w-3.5 h-3.5" />
      </motion.div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-background/95 backdrop-blur-md p-4 border-t border-border shadow-2xl"
      >
        <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-3" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            P
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold">Peter K.</div>
            <div className="text-[9px] text-muted-foreground">Škoda Octavia · BL-123AB</div>
          </div>
          <div className="text-[10px] font-semibold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Prichádza o <span className="font-bold text-foreground">4 min</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DoneScreen() {
  return (
    <motion.div {...fadeSlide} className="h-full flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.6, ease: "backOut" }}
        className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
      >
        <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[15px] font-bold mb-1"
      >
        Jazda dokončená!
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-[10px] text-muted-foreground mb-5"
      >
        Ako sa ti páčila jazda s Petrom?
      </motion.div>

      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6 + i * 0.08, type: "spring", stiffness: 200 }}
          >
            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="w-full p-3 rounded-xl bg-primary/5 border border-primary/20"
      >
        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
          <Users className="w-3 h-3" />
          Ušetril si 12 kg CO₂
        </div>
        <div className="text-[11px] font-semibold text-primary">Ďakujeme za spolujazdu 🌱</div>
      </motion.div>
    </motion.div>
  );
}
