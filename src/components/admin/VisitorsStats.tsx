import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Eye, Globe } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface PageViewRow {
  path: string;
  session_id: string | null;
  profile_id: string | null;
  created_at: string;
}

export default function VisitorsStats() {
  const [rows, setRows] = useState<PageViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const PAGE = 1000;
      const all: PageViewRow[] = [];
      let from = 0;
      // Paginate to bypass 1000-row limit and get ALL data
      while (true) {
        const { data, error, count } = await supabase
          .from('page_views')
          .select('path, session_id, profile_id, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        all.push(...(data as PageViewRow[]));
        if (count !== null) setTotalCount(count);
        if (data.length < PAGE) break;
        from += PAGE;
        if (from > 200000) break; // safety
      }
      setRows(all);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    let total = 0, today = 0, h24 = 0, d7 = 0;
    const sessions = new Set<string>();
    const sessions7d = new Set<string>();
    const users = new Set<string>();
    const pathCount = new Map<string, number>();
    const dayBuckets = new Map<string, { views: number; visitors: Set<string> }>();

    // initialize last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const k = d.toISOString().slice(0, 10);
      dayBuckets.set(k, { views: 0, visitors: new Set() });
    }

    for (const r of rows) {
      total++;
      const t = new Date(r.created_at).getTime();
      if (t >= todayStart.getTime()) today++;
      if (t >= last24h) h24++;
      if (t >= last7d) {
        d7++;
        if (r.session_id) sessions7d.add(r.session_id);
      }
      if (r.session_id) sessions.add(r.session_id);
      if (r.profile_id) users.add(r.profile_id);
      pathCount.set(r.path, (pathCount.get(r.path) ?? 0) + 1);
      const k = new Date(r.created_at).toISOString().slice(0, 10);
      const b = dayBuckets.get(k);
      if (b) {
        b.views++;
        if (r.session_id) b.visitors.add(r.session_id);
      }
    }

    const chartData = Array.from(dayBuckets.entries()).map(([date, v]) => ({
      date: date.slice(5),
      views: v.views,
      visitors: v.visitors.size,
    }));

    const topPaths = Array.from(pathCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total,
      today,
      h24,
      d7,
      uniqueSessions: sessions.size,
      uniqueSessions7d: sessions7d.size,
      knownUsers: users.size,
      chartData,
      topPaths,
    };
  }, [rows]);

  if (loading) {
    return <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Eye className="w-10 h-10 text-primary" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.today}</p>
                <p className="text-muted-foreground text-sm">Dnes (zobrazenia)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="w-10 h-10 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.d7}</p>
                <p className="text-muted-foreground text-sm">Posledných 7 dní</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-blue-500" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.uniqueSessions7d}</p>
                <p className="text-muted-foreground text-sm">Unikátni návštevníci (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Globe className="w-10 h-10 text-purple-500" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalCount || stats.total}</p>
                <p className="text-muted-foreground text-sm">Spolu (celá doba)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Návštevnosť za posledných 14 dní</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              views: { label: 'Zobrazenia', color: 'hsl(var(--primary))' },
              visitors: { label: 'Návštevníci', color: 'hsl(var(--accent))' },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer>
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="vw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="vv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#vw)" strokeWidth={2} />
                <Area type="monotone" dataKey="visitors" stroke="hsl(var(--accent))" fill="url(#vv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top stránky (celá doba)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cesta</TableHead>
                <TableHead className="text-right">Zobrazenia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.topPaths.map(([path, count]) => (
                <TableRow key={path}>
                  <TableCell className="font-mono text-sm">{path}</TableCell>
                  <TableCell className="text-right tabular-nums">{count}</TableCell>
                </TableRow>
              ))}
              {stats.topPaths.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Zatiaľ žiadne dáta
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
