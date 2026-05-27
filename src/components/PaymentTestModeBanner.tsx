import { isPaymentsTestMode } from "@/lib/stripe";
import { motion } from "framer-motion";
import { Rocket, Sparkles } from "lucide-react";

export function PaymentTestModeBanner() {
  if (!isPaymentsTestMode()) return null;

  return (
    <div className="w-full bg-gradient-to-r from-primary/90 via-[hsl(190_80%_45%)]/90 to-accent/90 border-b border-primary/30 px-4 py-2 text-center z-50 overflow-hidden relative">
      {/* Animated background shimmer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-primary-foreground">
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Rocket className="w-4 h-4" />
        </motion.span>

        <span>
          Prebieha posledná fáza vývoja pred spustením — čoskoro naživo!
        </span>

        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-4 h-4" />
        </motion.span>
      </div>
    </div>
  );
}
