import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed before
    const dismissed = localStorage.getItem("install-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("install-banner-dismissed", "true");
  };

  const handleIOSClick = () => {
    navigate("/install");
  };

  // Don't show if installed, dismissed, or on desktop without prompt
  if (isInstalled || isDismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-lg"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">Pridaj TakeMe na plochu</p>
              <p className="text-xs text-primary-foreground/80 truncate">
                {isIOS ? "Rýchly prístup z plochy" : "Jeden klik a máš aplikáciu"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {deferredPrompt ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Inštalovať
              </Button>
            ) : isIOS ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleIOSClick}
                className="gap-1.5 text-xs"
              >
                Ako na to?
              </Button>
            ) : null}

            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
              aria-label="Zavrieť"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;
