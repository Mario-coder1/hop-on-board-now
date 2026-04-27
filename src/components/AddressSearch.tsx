import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

interface AddressSearchProps {
  value: string;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  value,
  onSelect,
  placeholder = 'Hľadať adresu...',
  className = ''
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Autocomplete endpoint with address-level precision (street + house number),
      // POIs and places. Bias results toward Slovakia for better local matching,
      // but allow worldwide fallback.
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        language: 'sk',
        limit: '8',
        autocomplete: 'true',
        country: 'sk,cz,at,hu,pl',
        types: 'country,region,postcode,district,place,locality,neighborhood,address,poi',
      });

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?${params.toString()}`
      );
      const data = await response.json();
      let features: Suggestion[] = data.features || [];

      // If user typed a house number (e.g. "Hlavná 12" or "Hlavná 12/3") and we
      // got no address-level results, retry without country bias to widen search.
      const hasHouseNumber = /\d/.test(searchQuery);
      const hasAddressResult = features.some((f: any) =>
        Array.isArray(f.place_type) ? f.place_type.includes('address') : false
      );

      if (hasHouseNumber && !hasAddressResult) {
        const fallbackParams = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          language: 'sk',
          limit: '8',
          autocomplete: 'true',
          types: 'address,place,locality,neighborhood,poi',
        });
        const fallback = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?${fallbackParams.toString()}`
        );
        const fbData = await fallback.json();
        if (fbData.features?.length) {
          // Merge, preferring address results first, dedupe by id
          const merged = [...fbData.features, ...features];
          const seen = new Set<string>();
          features = merged.filter((f: Suggestion) => {
            if (seen.has(f.id)) return false;
            seen.add(f.id);
            return true;
          }).slice(0, 8);
        }
      }

      setSuggestions(features);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(newQuery);
    }, 300);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect(suggestion.place_name, suggestion.center[1], suggestion.center[0]);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onSelect('', 0, 0);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors text-sm border-b border-border last:border-b-0"
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
