import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getStripeEnvironment } from '@/lib/stripe';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Row {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  ride_id: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

const requestIdOf = (d: string | null) => d?.match(/request:([0-9a-f-]{36})/)?.[1] ?? null;

export default function AdminNoShowReports() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [pins, setPins] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, reporter_id, reported_user_id, ride_id, description, status, created_at')
      .eq('reason', 'driver_no_show')
      .order('created_at', { ascending: false })
      .limit(300);
    const list = (data ?? []) as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.flatMap((r) => [r.reporter_id, r.reported_user_id])));
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      setNames(Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name])));
    }
    const reqIds = list.map((r) => requestIdOf(r.description)).filter(Boolean) as string[];
    if (reqIds.length) {
      const { data: rq } = await supabase.from('ride_requests').select('id, pin_verified_at').in('id', reqIds);
      setPins(Object.fromEntries((rq ?? []).map((x) => [x.id, x.pin_verified_at])));
    }
  };

  useEffect(() => { load(); }, []);

  const repeat = useMemo(() => {
    const d: Record<string, number> = {}, p: Record<string, number> = {};
    rows.forEach((r) => { d[r.reported_user_id] = (d[r.reported_user_id] ?? 0) + 1; p[r.reporter_id] = (p[r.reporter_id] ?? 0) + 1; });
    return { d, p };
  }, [rows]);

  const top = (m: Record<string, number>) =>
    Object.entries(m).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const resolve = async (r: Row, approve: boolean) => {
    setBusy(r.id);
    try {
      if (approve) {
        const reqId = requestIdOf(r.description);
        if (!reqId) throw new Error('Chýba ID rezervácie');
        const { data, error } = await supabase.functions.invoke('refund-ride-payment', {
          body: { request_id: reqId, environment: getStripeEnvironment(), reason: 'Vodič nevyzdvihol spolujazdca (VOP 2.3) — schválené' },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        await supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', reqId);
      }
      await supabase.from('reports').update({ status: approve ? 'resolved' : 'dismissed' }).eq('id', r.id);
      toast({ title: approve ? 'Refundované' : 'Zamietnuté' });
      load();
    } catch (e) {
      toast({ title: 'Chyba', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Nahlásenia „Vodič ma nevyzdvihol" ({pending.length} čaká)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold mb-1">Opakovane nahlásení vodiči</p>
            {top(repeat.d).length === 0 ? <p className="text-muted-foreground text-xs">Žiadni</p> :
              top(repeat.d).map(([id, n]) => <p key={id} className="flex justify-between"><span>{names[id] ?? id.slice(0, 8)}</span><Badge variant="destructive">{n}×</Badge></p>)}
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold mb-1">Spolujazdci s opakovanými nahláseniami</p>
            {top(repeat.p).length === 0 ? <p className="text-muted-foreground text-xs">Žiadni</p> :
              top(repeat.p).map(([id, n]) => <p key={id} className="flex justify-between"><span>{names[id] ?? id.slice(0, 8)}</span><Badge variant="secondary">{n}×</Badge></p>)}
          </div>
        </div>

        {pending.length === 0 && <p className="text-sm text-muted-foreground">Žiadne otvorené nahlásenia.</p>}
        {pending.map((r) => {
          const reqId = requestIdOf(r.description);
          const pin = reqId ? pins[reqId] : null;
          return (
            <div key={r.id} className="rounded-lg border border-border p-3 text-sm space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span><strong>{names[r.reporter_id] ?? '?'}</strong> nahlásil vodiča <strong>{names[r.reported_user_id] ?? '?'}</strong></span>
                <Badge variant="secondary">vodič {repeat.d[r.reported_user_id]}×</Badge>
                <Badge variant="secondary">spolujazdec {repeat.p[r.reporter_id]}×</Badge>
                {pin ? <Badge variant="destructive">Nástupný kód overený — pravdepodobne nepravdivé</Badge> : <Badge>Kód neoverený</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('sk-SK')}</p>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === r.id || !!pin} onClick={() => resolve(r, true)}>
                  {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schváliť refundáciu'}
                </Button>
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => resolve(r, false)}>Zamietnuť</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
