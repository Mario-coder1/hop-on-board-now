import { useEffect, useState } from 'react';
import { Locate } from 'lucide-react';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { formatDbDate, parseDbTimestamp } from '@/lib/datetime';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

export default function DriverLastKnownLocation({ driverId }: { driverId: string }) {
  const { location, isLoading, error } = useDriverTracking(driverId);
  const [place, setPlace] = useState('');
  const valid = location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
    && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180;
  const grid = valid ? `${location.lat.toFixed(2)},${location.lng.toFixed(2)}` : '';

  useEffect(() => {
    setPlace('');
    if (!grid) return;
    const controller = new AbortController();
    const [lat, lng] = grid.split(',');
    void fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality&language=sk&limit=1&access_token=${MAPBOX_TOKEN}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => setPlace(data?.features?.[0]?.text || ''))
      .catch(() => {});
    return () => controller.abort();
  }, [grid]);

  const timestamp = valid ? parseDbTimestamp(location.updated_at) : null;
  return (
    <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground" aria-live="polite">
      <Locate className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {valid && !error ? <>
          <p className="font-medium text-foreground">{place ? `Vodič už prešiel: ${place}` : 'Poloha vodiča je uložená; názov obce zatiaľ nie je dostupný.'}</p>
          {timestamp && <p className="text-xs">Aktualizované {formatDbDate(timestamp.toISOString(), 'd. M. HH:mm')}. Poloha je približná a vodič už môže byť ďalej.</p>}
        </> : <p>{isLoading ? 'Zisťujem polohu vodiča…' : 'Poloha vodiča nie je dostupná. Bez zdieľanej polohy nevieme, kde sa práve nachádza.'}</p>}
      </div>
    </div>
  );
}