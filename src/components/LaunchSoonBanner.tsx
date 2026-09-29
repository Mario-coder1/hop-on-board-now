import { Sparkles } from "lucide-react";

/**
 * Tenký „šťartujeme" banner úplne navrchu každej stránky.
 * Nie je sticky — scroluje preč s obsahom, takže nikde nezavadza.
 */
const LaunchSoonBanner = () => (
  <div className="w-full bg-primary text-primary-foreground">
    <div className="container mx-auto px-4 py-1.5 flex items-center justify-center gap-2 text-[12px] sm:text-[13px] font-medium tracking-tight">
      <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>Už čoskoro štartujeme</span>
      <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
    </div>
  </div>
);

export default LaunchSoonBanner;
