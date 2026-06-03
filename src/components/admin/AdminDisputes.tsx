import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation2, AlertCircle, Clock, User, CreditCard, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface RideRow {
  id: string;
  driver_id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  driver?: { full_name: string; phone: string | null } | null;
}

interface RequestRow {
  id: string;
  passenger_id: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  payment_status: string;
  amount_paid: number | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  passenger?: { full_name: string; phone: string | null } | null;
}

interface LocationPing {
  id: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const AdminDisputes = () => {
  const [filter, setFilter] = useState<'cancelled' | 'completed' | 'all'>('cancelled');
  const [search, setSearch] = useState('');
  const [rides, setRides] = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideRow | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [locations, setLocations] = useState<LocationPing[]>([]);
  const [focusRequest, setFocusRequest] = useState<RequestRow | null>(null);

  const loadRides = async () => {
    setLoading(true);
    let q = supabase
      .from('rides')
      .select('id,driver_id,origin_address,destination_address,departure_time,status,cancelled_at,cancellation_reason,created_at')
      .order('departure_time', { ascending: false })
      .limit(100);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) {
      toast.error('Nepodarilo sa načítať jazdy');
      setLoading(false);
      return;
    }
    const driverIds = Array.from(new Set((data ?? []).map((r) => r.driver_id)));
    const { data: profs } = await supabase.from('profiles').select('id,full_name,phone').in('id', driverIds);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    setRides((data ?? []).map((r: any) => ({ ...r, driver: map.get(r.driver_id) ?? null })));
    setLoading(false);
  };

  useEffect(() => {
    loadRides();
  }, [filter]);

  const filteredRides = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return rides;
    return rides.filter(
      (r) =>
        r.origin_address.toLowerCase().includes(s) ||
        r.destination_address.toLowerCase().includes(s) ||
        r.driver?.full_name?.toLowerCase().includes(s)
    );
  }, [rides, search]);

  const openRide = async (ride: RideRow) => {
    setSelectedRide(ride);
    setFocusRequest(null);
    setLocations([]);
    const { data: reqs } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('ride_id', ride.id)
      .order('created_at', { ascending: false });
    const passIds = Array.from(new Set((reqs ?? []).map((r: any) => r.passenger_id)));
    const { data: profs } = await supabase.from('profiles').select('id,full_name,phone').in('id', passIds);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    setRequests((reqs ?? []).map((r: any) => ({ ...r, passenger: map.get(r.passenger_id) ?? null })));
  };

  const inspectRequest = async (req: RequestRow) => {
    if (!selectedRide) return;
    setFocusRequest(req);
    // Reference time = cancellation, payment time, or now
    const ref = req.cancelled_at || req.paid_at || req.created_at;
    const refDate = new Date(ref);
    const from = new Date(refDate.getTime() - 30 * 60 * 1000).toISOString(); // -30 min
    const to = new Date(refDate.getTime() + 30 * 60 * 1000).toISOString(); // +30 min
    const { data, error } = await supabase
      .from('driver_location_history')
      .select('id,lat,lng,speed,heading,recorded_at')
      .eq('profile_id', selectedRide.driver_id)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: true });
    if (error) {
      toast.error('Nepodarilo sa načítať GPS históriu');
      return;
    }
    setLocations((data ?? []) as any);
  };

  const closest = useMemo(() => {
    if (!focusRequest || locations.length === 0) return null;
    const ref = focusRequest.cancelled_at || focusRequest.paid_at || focusRequest.created_at;
    const refTs = new Date(ref).getTime();
    let best: LocationPing | null = null;
    let bestDt = Infinity;
    for (const p of locations) {
      const dt = Math.abs(new Date(p.recorded_at).getTime() - refTs);
      if (dt < bestDt) {
        bestDt = dt;
        best = p;
      }
    }
    if (!best) return null;
    const distance = haversine(
      { lat: focusRequest.pickup_lat, lng: focusRequest.pickup_lng },
      { lat: best.lat, lng: best.lng }
    );
    return { ping: best, distance, dtSec: bestDt / 1000 };
  }, [focusRequest, locations]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Reklamácie / Jazdy
          </CardTitle>
          <div className="flex gap-2 pt-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cancelled">Zrušené</SelectItem>
                <SelectItem value="completed">Dokončené</SelectItem>
                <SelectItem value="all">Všetky</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="hľadať…" className="h-9 pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground">Načítavam…</p>}
          {!loading && filteredRides.length === 0 && <p className="text-sm text-muted-foreground">Žiadne jazdy</p>}
          {filteredRides.map((r) => (
            <button
              key={r.id}
              onClick={() => openRide(r)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedRide?.id === r.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(r.departure_time), 'd.M.yyyy HH:mm', { locale: sk })}
                </span>
                <Badge variant={r.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {r.status}
                </Badge>
              </div>
              <p className="text-sm font-medium truncate">{r.origin_address}</p>
              <p className="text-xs text-muted-foreground truncate">→ {r.destination_address}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{r.driver?.full_name ?? 'Neznámy vodič'}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedRide ? 'Detail jazdy' : 'Vyber jazdu zo zoznamu'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedRide && (
            <p className="text-sm text-muted-foreground">
              Vyber jazdu vľavo. Otvorí sa detail s pasažiermi, platbami a GPS históriou vodiča okolo momentu zrušenia / platby.
            </p>
          )}
          {selectedRide && (
            <>
              <div className="space-y-1 text-sm">
                <p><strong>Vodič:</strong> {selectedRide.driver?.full_name} {selectedRide.driver?.phone && <span className="text-muted-foreground">· {selectedRide.driver.phone}</span>}</p>
                <p><strong>Trasa:</strong> {selectedRide.origin_address} → {selectedRide.destination_address}</p>
                <p><strong>Odjazd:</strong> {format(new Date(selectedRide.departure_time), 'PPpp', { locale: sk })}</p>
                <p><strong>Stav:</strong> <Badge variant="outline">{selectedRide.status}</Badge></p>
                {selectedRide.cancelled_at && (
                  <p className="text-destructive">
                    <strong>Zrušená:</strong> {format(new Date(selectedRide.cancelled_at), 'PPpp', { locale: sk })}
                    {selectedRide.cancellation_reason && ` — ${selectedRide.cancellation_reason}`}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><User className="w-4 h-4" /> Pasažieri ({requests.length})</h4>
                {requests.length === 0 && <p className="text-xs text-muted-foreground">Žiadne žiadosti</p>}
                <div className="space-y-2">
                  {requests.map((rq) => (
                    <div key={rq.id} className={`p-3 rounded-lg border ${focusRequest?.id === rq.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{rq.passenger?.full_name ?? 'Neznámy'} {rq.passenger?.phone && <span className="text-xs text-muted-foreground">· {rq.passenger.phone}</span>}</p>
                          <p className="text-xs text-muted-foreground truncate"><MapPin className="inline w-3 h-3" /> {rq.pickup_address}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                            <Badge variant="outline" className="text-[10px]">{rq.status}</Badge>
                            <Badge variant={rq.payment_status === 'paid' ? 'default' : rq.payment_status === 'refunded' ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                              <CreditCard className="w-3 h-3" />{rq.payment_status}{rq.amount_paid ? ` · ${rq.amount_paid}€` : ''}
                            </Badge>
                            {rq.cancelled_at && (
                              <span className="text-[10px] text-destructive">zrušené {format(new Date(rq.cancelled_at), 'd.M. HH:mm', { locale: sk })}</span>
                            )}
                            {rq.paid_at && !rq.cancelled_at && (
                              <span className="text-[10px] text-muted-foreground">platba {format(new Date(rq.paid_at), 'd.M. HH:mm', { locale: sk })}</span>
                            )}
                          </div>
                          {rq.cancellation_reason && <p className="text-xs text-muted-foreground mt-1 italic">„{rq.cancellation_reason}“</p>}
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => inspectRequest(rq)}>
                          <Navigation2 className="w-3.5 h-3.5 mr-1" />GPS
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {focusRequest && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1"><Clock className="w-4 h-4" /> GPS vodiča (±30 min)</h4>
                    <p className="text-xs text-muted-foreground">
                      Referenčný čas: {format(new Date(focusRequest.cancelled_at || focusRequest.paid_at || focusRequest.created_at), 'PPpp', { locale: sk })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pickup: {focusRequest.pickup_lat.toFixed(5)}, {focusRequest.pickup_lng.toFixed(5)}
                    </p>
                  </div>

                  {locations.length === 0 ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                      ⚠️ <strong>Žiadne GPS záznamy</strong> v tomto okne. Vodič nemal aktívne zdieľanie polohy — silný indikátor, že na mieste nebol.
                    </div>
                  ) : (
                    <>
                      {closest && (
                        <div className={`p-3 rounded-lg border text-sm ${
                          closest.distance < 200 ? 'bg-green-500/10 border-green-500/30' :
                          closest.distance < 1000 ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-destructive/10 border-destructive/30'
                        }`}>
                          <p><strong>Najbližšia poloha:</strong> {closest.distance < 1000 ? `${Math.round(closest.distance)} m` : `${(closest.distance / 1000).toFixed(2)} km`} od pickup</p>
                          <p className="text-xs text-muted-foreground">v čase {format(new Date(closest.ping.recorded_at), 'PPpp', { locale: sk })} (±{Math.round(closest.dtSec)}s od ref. času)</p>
                          <a
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                            href={`https://www.google.com/maps/dir/${focusRequest.pickup_lat},${focusRequest.pickup_lng}/${closest.ping.lat},${closest.ping.lng}`}
                            target="_blank" rel="noreferrer"
                          >
                            Otvoriť v Mapách <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      <div className="max-h-80 overflow-y-auto border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr className="text-left">
                              <th className="px-2 py-1.5">Čas</th>
                              <th className="px-2 py-1.5">Súradnice</th>
                              <th className="px-2 py-1.5 text-right">Vzdial.</th>
                              <th className="px-2 py-1.5 text-right">Rýchl.</th>
                              <th className="px-2 py-1.5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {locations.map((p) => {
                              const d = haversine({ lat: focusRequest.pickup_lat, lng: focusRequest.pickup_lng }, { lat: p.lat, lng: p.lng });
                              return (
                                <tr key={p.id} className="border-t">
                                  <td className="px-2 py-1.5 tabular-nums">{format(new Date(p.recorded_at), 'HH:mm:ss', { locale: sk })}</td>
                                  <td className="px-2 py-1.5 tabular-nums">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">{d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">{p.speed != null ? `${Math.round(p.speed * 3.6)} km/h` : '–'}</td>
                                  <td className="px-2 py-1.5">
                                    <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                      mapa
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDisputes;
