import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Radio, Database, Coins, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Kalibračné konštanty (odvodené od throttlingu v useDriverTracking.ts)
// history sample = 1× / 20 s
// DB upsert     = 1× / 15 s  →  history × (20/15) ≈ 1.33
// Broadcast     = 1× / 2–4 s (adaptívne)  →  konzervatívny násobok 5×
const HISTORY_TO_DB_MULT = 20 / 15;
const HISTORY_TO_BROADCAST_MULT = 5;

// Odhadovaná cena — pre presnú kalkuláciu pozri Cloud billing.
// Realtime broadcast: ~0.000002 kreditu / správu (WebSocket, extrémne lacné)
// DB write: ~0.00002 kreditu / row (upsert + replikácia)
// Tieto hodnoty sú indikatívne — reálnu spotrebu vidíš v Settings → Plans & credits.
const CREDIT_PER_BROADCAST = 0.000002;
const CREDIT_PER_DB_WRITE = 0.00002;

interface Stats {
  historyLast24h: number;
  historyLast7d: number;
  activeDrivers24h: number;
}

export default function LiveUpdatesStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const d1 = new Date(now.getTime() - 24 * 3600_000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();

      const [{ count: c24 }, { count: c7 }, { data: drivers }] = await Promise.all([
        supabase
          .from('driver_location_history')
          .select('*', { count: 'exact', head: true })
          .gte('recorded_at', d1),
        supabase
          .from('driver_location_history')
          .select('*', { count: 'exact', head: true })
          .gte('recorded_at', d7),
        supabase
          .from('driver_location_history')
          .select('profile_id')
          .gte('recorded_at', d1),
      ]);

      const activeDrivers = new Set((drivers ?? []).map((r: any) => r.profile_id)).size;

      setStats({
        historyLast24h: c24 ?? 0,
        historyLast7d: c7 ?? 0,
        activeDrivers24h: activeDrivers,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const broadcasts24h = Math.round(stats.historyLast24h * HISTORY_TO_BROADCAST_MULT);
  const dbWrites24h = Math.round(stats.historyLast24h * HISTORY_TO_DB_MULT);
  const dailyCredits =
    broadcasts24h * CREDIT_PER_BROADCAST + dbWrites24h * CREDIT_PER_DB_WRITE;
  const monthlyCredits = dailyCredits * 30;

  const weeklyAvgPerDay = stats.historyLast7d / 7;
  const trend =
    stats.historyLast24h > weeklyAvgPerDay
      ? Math.round(((stats.historyLast24h - weeklyAvgPerDay) / (weeklyAvgPerDay || 1)) * 100)
      : Math.round(((stats.historyLast24h - weeklyAvgPerDay) / (weeklyAvgPerDay || 1)) * 100);

  const fmt = (n: number) => n.toLocaleString('sk-SK');
  const fmtCr = (n: number) =>
    n < 0.01
      ? '< 0,01'
      : n.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Live poloha — spotreba za 24 h
        </h3>
        <p className="text-sm text-muted-foreground">
          Odhad podľa počtu history vzoriek (WebSocket broadcasty sa nelogujú, sú odvodené).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              Broadcasty (WS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{fmt(broadcasts24h)}</p>
            <p className="text-xs text-muted-foreground">≈ {fmt(broadcasts24h * 30)} / mesiac</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              DB zápisy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{fmt(dbWrites24h)}</p>
            <p className="text-xs text-muted-foreground">upsert / 15 s + history / 20 s</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Aktívni vodiči
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{stats.activeDrivers24h}</p>
            <p className="text-xs text-muted-foreground">za posledných 24 h</p>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              Odhad kreditov
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{fmtCr(dailyCredits)}</p>
            <p className="text-xs text-muted-foreground">
              ≈ {fmtCr(monthlyCredits)} / mesiac
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Detail výpočtu
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Vzorky history za 24 h:</span>
            <span className="text-foreground tabular-nums text-right">{fmt(stats.historyLast24h)}</span>
            <span>Priemer / deň (7 d):</span>
            <span className="text-foreground tabular-nums text-right">{fmt(Math.round(weeklyAvgPerDay))}</span>
            <span>Trend dnes vs. týždeň:</span>
            <span className={`text-right tabular-nums ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          </div>
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Odhadovacia sadzba:</strong> broadcast {CREDIT_PER_BROADCAST} kr/správa,
              DB zápis {CREDIT_PER_DB_WRITE} kr/riadok.
            </p>
            <p>
              Presnú fakturáciu vidíš v Settings → Plans & credits. Broadcast správy nie sú
              logované — počet je odvodený z history (×{HISTORY_TO_BROADCAST_MULT}).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
