import { Languages } from 'lucide-react';
import { SPOKEN_LANGUAGES } from '@/lib/spokenLanguages';

const DriverSpokenLanguages = ({ languages }: { languages?: string[] | null }) => {
  const selected = SPOKEN_LANGUAGES.filter(language => languages?.includes(language.code));
  if (!selected.length) return null;

  return (
    <div aria-label="Jazyky vodiča" className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
      <Languages aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
        {selected.map(language => (
          <span key={language.code} className="inline-flex items-center gap-1">
            <span aria-hidden="true">{language.flag}</span>
            <span>{language.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default DriverSpokenLanguages;