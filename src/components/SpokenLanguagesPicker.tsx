import { SPOKEN_LANGUAGES } from "@/lib/spokenLanguages";

const SpokenLanguagesPicker = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {SPOKEN_LANGUAGES.map((l) => {
      const on = value.includes(l.code);
      return (
        <button
          key={l.code}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(on ? value.filter((c) => c !== l.code) : [...value, l.code])}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-foreground border-border"
          }`}
        >
          {l.flag} {l.label}
        </button>
      );
    })}
  </div>
);

export default SpokenLanguagesPicker;
