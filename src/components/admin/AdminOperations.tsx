import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Ban, RefreshCw, XCircle, Clock, MapPin, ChevronRight, Users, Route, History, Loader2 } from 'lucide-react';
import { formatDbDate } from '@/lib/datetime';

interface RideDetailData {
  ride: Record<string, any> | null;
  stops: { id: string; stop_order: number; address: string }[];
  requests: Record<string, any>[];
}

interface TimelineEvent {
  at: string;
  label: string;
}

interface LiveRide {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  status: string | null;
  available_seats: number;
  driver_id: string;
}

interface CancelledRequest {
  id: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  status: string | null;
  passenger_id: string;
  ride_id: string;
}

interface BlockRow {
  id: string;
  created_at: string;
  reason: string | null;
  blocker_id: string;
  blocked_user_id: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function AdminOperations() {
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<LiveRide[]>([]);
  const [cancels, setCancels] = useState<CancelledRequest[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [openRideId, setOpenRideId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RideDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (rideId: string) => {
    setOpenRideId(rideId);
    setDetail(null);
    setDetailLoading(true);
    const [rideRes, stopsRes, reqRes] = await Promise.all([
      supabase.from('rides').select('*').eq('id', rideId).maybeSingle(),
      supabase.from('ride_stops').select('id, stop_order, address').eq('ride_id', rideId).order('stop_order'),
      supabase
        .from('ride_requests')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true }),
    ]);

    const requests = (reqRes.data ?? []) as Record<string, any>[];
    const missing = requests.map((r) => r.passenger_id as string).filter((id) => id && !names[id]);
    if (missing.length) {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', missing);
      if (data?.length) {
        setNames((prev) => {
          const next = { ...prev };
          (data as { id: string; full_name: string }[]).forEach((p) => {
            next[p.id] = p.full_name;
          });
          return next;
        });
      }
    }

    setDetail({
      ride: (rideRes.data as Record<string, any>) ?? null,
      stops: (stopsRes.data ?? []) as RideDetailData['stops'],
      requests,
    });
    setDetailLoading(false);
  }, [names]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ridesRes, cancelRes, blockRes] = await Promise.all([
      supabase
        .from('rides')
        .select('id, origin_address, destination_address, departure_time, status, available_seats, driver_id')
        .in('status', ['active', 'in_progress'])
        .order('departure_time', { ascending: true })
        .limit(50),
      supabase
        .from('ride_requests')
        .select('id, cancelled_at, cancellation_reason, status, passenger_id, ride_id')
        .eq('status', 'cancelled')
        .order('cancelled_at', { ascending: false })
        .limit(20),
      supabase
        .from('blocked_users')
        .select('id, created_at, reason, blocker_id, blocked_user_id')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const rideRows = (ridesRes.data ?? []) as LiveRide[];
    const cancelRows = (cancelRes.data ?? []) as CancelledRequest[];
    const blockRows = (blockRes.data ?? []) as BlockRow[];

    setRides(rideRows);
    setCancels(cancelRows);
    setBlocks(blockRows);

    const ids = Array.from(
      new Set([
        ...rideRows.map((r) => r.driver_id),
        ...cancelRows.map((c) => c.passenger_id),
        ...blockRows.flatMap((b) => [b.blocker_id, b.blocked_user_id]),
      ]),
    ).filter(Boolean);

    if (ids.length) {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: { id: string; full_name: string }) => {
        map[p.id] = p.full_name;
      });
      setNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rides.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.origin_address.toLowerCase().includes(q) ||
      r.destination_address.toLowerCase().includes(q) ||
      (names[r.driver_id] ?? '').toLowerCase().includes(q)
    );
  });

  const nameOf = (id: string) => names[id] ?? 'Neznámy';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          Operatívny prehľad — aktívne jazdy, zrušenia a blokovania
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Obnoviť
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Aktívne / prebiehajúce jazdy', value: rides.length, icon: MapPin },
          { label: 'Posledné zrušené rezervácie', value: cancels.length, icon: XCircle },
          { label: 'Blokovania používateľov', value: blocks.length, icon: Ban },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Aktívne jazdy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Filtruj podľa mesta alebo vodiča…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Žiadne jazdy.</p>
          )}
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.origin_address} → {r.destination_address}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatDbDate(r.departure_time, 'd.M.yyyy HH:mm')} · {nameOf(r.driver_id)} · {r.available_seats} miest
                  </p>
                </div>
                <Badge variant="outline" className={statusColors[r.status ?? ''] ?? ''}>
                  {r.status === 'in_progress' ? 'LIVE' : 'Aktívna'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Posledné zrušenia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cancels.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Žiadne zrušenia.</p>
            )}
            {cancels.map((c) => (
              <div key={c.id} className="rounded-xl border border-border/60 p-3">
                <p className="text-sm font-medium">{nameOf(c.passenger_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {c.cancelled_at ? formatDbDate(c.cancelled_at, 'd.M.yyyy HH:mm') : '—'}
                </p>
                <p className="text-xs mt-1">{c.cancellation_reason || 'Bez dôvodu'}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="w-4 h-4" /> Blokovania
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blocks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Žiadne blokovania.</p>
            )}
            {blocks.map((b) => (
              <div key={b.id} className="rounded-xl border border-border/60 p-3">
                <p className="text-sm font-medium">
                  {nameOf(b.blocker_id)} → {nameOf(b.blocked_user_id)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDbDate(b.created_at, 'd.M.yyyy HH:mm')}</p>
                <p className="text-xs mt-1">{b.reason || 'Bez dôvodu'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
