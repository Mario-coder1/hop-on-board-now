import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, ShieldAlert, CreditCard, Clock,
} from 'lucide-react';

interface PaymentEvent {
  id: string;
  source: string;
  event_type: string;
  environment: string | null;
  status: string;
  stripe_session_id: string | null;
  ride_id: string | null;
  amount: number | null;
  error_message: string | null;
  retry_count: number;
  resolved_at: string | null;
  last_retry_at: string | null;
  created_at: string;
}

interface Stats {
  errors_open: number;
  errors_24h: number;
  resolved_7d: number;
  total_7d: number;
  pending_unpaid_requests: number;
}

interface ConfigHealth {
  sandbox: { api_key: boolean; webhook_secret: boolean };
  live: { api_key: boolean; webhook_secret: boolean };
  gateway_key: boolean;
  service_role: boolean;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'success':
    case 'resolved':
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Vyriešené</Badge>;
    case 'duplicate':
      return <Badge variant="secondary">Duplikát</Badge>;
    default:
      return <Badge variant="destructive">Chyba</Badge>;
  }
};

export default function AdminPaymentEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<ConfigHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyErrors, setOnlyErrors] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payment_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (onlyErrors) query = query.eq('status', 'error');

      const [{ data: rows, error }, statsRes, healthRes] = await Promise.all([
        query,
        supabase.rpc('admin_payment_event_stats'),
        supabase.functions.invoke('payments-admin', { body: { action: 'health' } }),
      ]);

      if (error) throw error;
      setEvents((rows ?? []) as PaymentEvent[]);
      if (statsRes.data) setStats(statsRes.data as unknown as Stats);
      if (healthRes.data?.config) setConfig(healthRes.data.config as ConfigHealth);
    } catch (e: any) {
      toast({ title: 'Nepodarilo sa načítať platobné udalosti', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [onlyErrors, toast]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'reprocess' | 'resolve') => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke('payments-admin', {
        body: { action, event_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: action === 'reprocess' ? 'Udalosť opätovne spracovaná' : 'Označené ako vyriešené',
        description: data?.result === 'duplicate' ? 'Rezervácia už existovala.' : undefined,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Zlyhalo spracovanie', description: e.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const cfgRow = (label: string, ok: boolean) => (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <CheckCircle2 className="w-4 h-4" /> Nastavené
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-amber-600 font-medium">
          <ShieldAlert className="w-4 h-4" /> Chýba
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Otvorené chyby', value: stats?.errors_open ?? 0, icon: AlertTriangle, danger: (stats?.errors_open ?? 0) > 0 },
          { label: 'Chyby za 24 h', value: stats?.errors_24h ?? 0, icon: CreditCard, danger: (stats?.errors_24h ?? 0) > 0 },
          { label: 'Vyriešené (7 dní)', value: stats?.resolved_7d ?? 0, icon: CheckCircle2, danger: false },
          { label: 'Nezaplatené > 1 h', value: stats?.pending_unpaid_requests ?? 0, icon: Clock, danger: (stats?.pending_unpaid_requests ?? 0) > 0 },
        ].map(({ label, value, icon: Icon, danger }) => (
          <Card key={label} className={danger ? 'border-destructive/40' : undefined}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Konfigurácia platieb
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="grid md:grid-cols-2 gap-x-8">
              <div>
                {cfgRow('Test režim — API kľúč', config.sandbox.api_key)}
                {cfgRow('Test režim — webhook', config.sandbox.webhook_secret)}
              </div>
              <div>
                {cfgRow('Živý režim — API kľúč', config.live.api_key)}
                {cfgRow('Živý režim — webhook', config.live.webhook_secret)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Načítavam…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Platobné udalosti</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOnlyErrors((v) => !v)}>
              {onlyErrors ? 'Zobraziť všetky' : 'Len chyby'}
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Načítavam…</p>}
          {!loading && events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {onlyErrors ? 'Žiadne chyby platieb 🎉' : 'Žiadne platobné udalosti.'}
            </p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-border/60 p-3 space-y-2 bg-card/50">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(ev.status)}
                <span className="font-medium text-sm">{ev.event_type}</span>
                <Badge variant="outline" className="text-xs">{ev.source}</Badge>
                {ev.environment && <Badge variant="outline" className="text-xs">{ev.environment}</Badge>}
                {ev.amount != null && ev.amount > 0 && (
                  <span className="text-sm font-semibold tabular-nums">{ev.amount.toFixed(2)} €</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(ev.created_at).toLocaleString('sk-SK')}
                </span>
              </div>

              {ev.error_message && (
                <p className="text-sm text-destructive break-words">{ev.error_message}</p>
              )}

              <div className="text-xs text-muted-foreground space-y-0.5 break-all">
                {ev.stripe_session_id && <p>Session: {ev.stripe_session_id}</p>}
                {ev.ride_id && <p>Jazda: {ev.ride_id}</p>}
                {ev.retry_count > 0 && (
                  <p>
                    Pokusy: {ev.retry_count}
                    {ev.last_retry_at && ` · posledný ${new Date(ev.last_retry_at).toLocaleString('sk-SK')}`}
                  </p>
                )}
              </div>

              {ev.status === 'error' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => act(ev.id, 'reprocess')} disabled={busyId === ev.id}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Spracovať znova
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act(ev.id, 'resolve')} disabled={busyId === ev.id}>
                    Označiť vyriešené
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
