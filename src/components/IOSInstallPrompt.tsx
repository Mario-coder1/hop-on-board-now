import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, Plus, Check, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ios-install-prompt-shown";

const IOSInstallPrompt = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Already installed (running as PWA)?
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // iOS Safari standalone flag
    if ((window.navigator as { standalone?: boolean }).standalone) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (!isIOS) return;

    // Detect Safari (iOS PWA install only works in Safari)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    if (!isSafari) return;

    // Show only once per device
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Slight delay so it doesn't compete with first paint
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              aria-label="Zavrieť"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-6 pt-8 pb-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center">
                <Smartphone className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-1">Pridaj TakeMe na plochu</h2>
              <p className="text-sm text-primary-foreground/85">
                Rýchly prístup, push notifikácie a plnohodnotný zážitok
              </p>
            </div>

            {/* Steps */}
            <div className="p-6 space-y-3">
              <Step
                num={1}
                icon={<Share className="w-5 h-5" />}
                title="Klikni na ikonu zdieľania"
                subtitle="V dolnej lište Safari (štvorček so šípkou hore)"
              />
              <Step
                num={2}
                icon={<Plus className="w-5 h-5" />}
                title='Vyber „Pridať na plochu"'
                subtitle="Posuň sa dole v zozname možností"
              />
              <Step
                num={3}
                icon={<Check className="w-5 h-5" />}
                title='Potvrď „Pridať"'
                subtitle="Hotovo — ikona pribudne na ploche"
              />

              <div className="pt-2">
                <Button onClick={close} variant="outline" className="w-full" size="lg">
                  Rozumiem, ukáž mi appku
                </Button>
                <p className="text-[11px] text-center text-muted-foreground mt-3">
                  Funguje len v Safari prehliadači na iPhone/iPad
                </p>
              </div>
            </div>

            {/* Animated arrow pointing to bottom Safari share bar */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 pointer-events-none"
              aria-hidden
            >
              <div className="bg-primary text-primary-foreground text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
                ↓ Ikona zdieľania je dole
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Step = ({
  num,
  icon,
  title,
  subtitle,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold text-sm relative">
      {num}
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-foreground">
        {icon}
      </span>
    </div>
    <div className="flex-1 min-w-0 pt-1">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  </div>
);

export default IOSInstallPrompt;
