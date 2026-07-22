import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Locate, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

interface Suggestion {
  id: string;
  place_name: string;
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showGps?: boolean;
  className?: string;
  inputClassName?: string;
  leftDot?: React.ReactNode;
}

/**
 * Text input with Mapbox autocomplete suggestions and optional GPS autofill.
 * Fills the full address (place_name) — not just city — for both typed selections
 * and GPS-based reverse geocoding.
 */
const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  placeholder,
  showGps = false,
  className = '',
  inputClassName = '',
  leftDot,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const userTyped = useRef(false);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const search = async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        language: 'sk',
        limit: '6',
        autocomplete: 'true',
        types: 'country,region,postcode,district,place,locality,neighborhood,address,poi',
      });
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (e) {
      console.error('Geocoding error:', e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    userTyped.current = true;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const handlePick = (s: Suggestion) => {
    userTyped.current = false;
    onChange(s.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleGps = () => {
    if (!('geolocation' in navigator)) {
      toast({ title: 'Poloha nedostupná', description: 'Prehliadač nepodporuje geolokáciu.', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?language=sk&limit=1&access_token=${MAPBOX_TOKEN}`
          );
          const data = await res.json();
          const place = data?.features?.[0];
          const label = place?.place_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          onChange(label);
          toast({ title: 'Poloha vyplnená', description: label });
        } catch {
          onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast({ title: 'Poloha zistená', description: 'Použil som súradnice.' });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
        toast({ title: 'Nepodarilo sa zistiť polohu', description: 'Skontroluj povolenie polohy.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {leftDot !== undefined ? (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">{leftDot}</div>
      ) : (
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
      )}
      <Input
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={`pl-10 ${showGps ? 'pr-11' : ''} ${inputClassName}`}
      />
      {loading && (
        <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}
      {showGps && (
        <button
          type="button"
          onClick={handleGps}
          disabled={locating}
          aria-label="Použi moju polohu"
          title="Použi moju polohu"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 z-10"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
        </button>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors text-sm border-b border-border last:border-b-0"
              onClick={() => handlePick(s)}
            >
              {s.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearchInput;
