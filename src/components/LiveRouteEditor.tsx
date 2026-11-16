import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AddressSearch from '@/components/AddressSearch';
import Map from '@/components/Map';
import RouteAlternativesSelector, { type RouteOption } from '@/components/RouteAlternativesSelector';
import { liveRouteUpdate, liveRouteWaypoints, type RoutePoint } from '@/lib/liveRoute';
import { parseRoutePolyline } from '@/lib/routeProximity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void;
  ride: { id: string; origin_lat: number; origin_lng: number; destination_lat: number; destination_lng: number; route_polyline?: string | null };
  driverId: string; passengerPoints: RoutePoint[];
};

export default function LiveRouteEditor({ open, onOpenChange, onSaved, ride, driverId, passengerPoints }: Props) {
  const { toast } = useToast();
  const [stops, setStops] = useState<RoutePoint[]>([]);
  const [ready, setReady] = useState(false);
  const [via, setVia] = useState<(RoutePoint & { address: string }) | null>(null);
  const [selected, setSelected] = useState<RouteOption | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false); setVia(null); setSelected(null);
    void supabase.from('ride_stops').select('lat, lng').eq('ride_id', ride.id).order('stop_order').then(({ data, error }) => {
      if (cancelled) return;
      if (error) { toast({ title: 'Zastávky sa nepodarilo načítať', variant: 'destructive' }); return; }
      setStops((data ?? []).map(p => ({ lat: Number(p.lat), lng: Number(p.lng) })));
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [open, ride.id]);
  const waypoints = liveRouteWaypoints([...stops, ...passengerPoints, ...(via ? [via] : [])], parseRoutePolyline(ride.route_polyline ?? null) ?? []);
  const save = async () => {
    if (!selected || !ready) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('rides').update(liveRouteUpdate(selected.coordinates))
        .eq('id', ride.id).eq('driver_id', driverId).in('status', ['active', 'in_progress']).select('id').maybeSingle();
      if (error || !data) throw new Error(error?.message ?? 'Jazda už nie je aktívna.');
      toast({ title: 'Cesta bola zmenená' }); onSaved(); onOpenChange(false);
    } catch (e) {
      toast({ title: 'Cestu sa nepodarilo uložiť', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o); }}>
    <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Zmeniť cestu</DialogTitle><DialogDescription>Cieľ, dohodnuté nástupy, výstupy a ceny zostávajú nezmenené. Upravujte iba pri bezpečnom zastavení.</DialogDescription></DialogHeader>
      <div className="flex gap-2 items-start">
        <AddressSearch value={via?.address ?? ''} placeholder="Cez ktorú obec alebo ulicu pôjdeš?" className="flex-1 min-w-0" onSelect={(address, lat, lng) => { setSelected(null); setVia({ address, lat, lng }); }} />
        {via && <Button size="icon" variant="ghost" aria-label="Odstrániť prejazd" onClick={() => { setVia(null); setSelected(null); }}><X className="h-4 w-4" /></Button>}
      </div>
      {ready ? <RouteAlternativesSelector origin={{ lat: ride.origin_lat, lng: ride.origin_lng }} destination={{ lat: ride.destination_lat, lng: ride.destination_lng }} waypoints={waypoints} selectedIndex={selected?.index ?? 0} onSelect={setSelected} onRoutesLoaded={() => {}} onLoadingChange={loading => { if (loading) setSelected(null); }} /> : <Loader2 className="h-5 w-5 animate-spin" />}
      {selected && <div className="h-56 overflow-hidden rounded-lg border border-border"><Map route={selected.coordinates} interactive className="h-full w-full" /></div>}
      <Button onClick={save} disabled={!selected || saving || !ready}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Uložiť cestu</Button>
    </DialogContent>
  </Dialog>;
}