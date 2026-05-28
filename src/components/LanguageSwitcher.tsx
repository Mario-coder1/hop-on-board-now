import { useLanguage, Lang } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";

const LANG_LABELS: Record<Lang, { label: string; flag: string }> = {
  sk: { label: "Slovenčina", flag: "🇸🇰" },
  cs: { label: "Čeština", flag: "🇨🇿" },
  en: { label: "English", flag: "🇬🇧" },
  pl: { label: "Polski", flag: "🇵🇱" },
};

const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { lang, setLang } = useLanguage();
  const current = LANG_LABELS[lang];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="glass"
          size="sm"
          className={`gap-2 rounded-full px-3 h-9 ${className ?? ""}`}
          aria-label="Language"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-semibold">{current.flag} {lang.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] bg-popover">
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLang(l)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{LANG_LABELS[l].flag}</span>
              <span>{LANG_LABELS[l].label}</span>
            </span>
            {lang === l && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
