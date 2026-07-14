import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';

interface VisitorStats {
  today: number;
  h24: number;
  d7: number;
  total: number;
  unique_sessions_7d: number;
  known_users_7d: number;
  daily: { date: string; views: number; visitors: number }[];
  top_paths: { path: string; views: number }[];
}

export default function VisitorsStats() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_visitor_stats');
      if (!error && data) setStats(data as unknown as VisitorStats);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    );
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
                <p className="text-2xl font-bold tabular-nums">{stats.unique_sessions_7d}</p>
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
                <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
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
              <AreaChart data={stats.daily}>
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
          <CardTitle>Top stránky (30 dní)</CardTitle>
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
              {stats.top_paths.map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="font-mono text-sm">{p.path}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.views}</TableCell>
                </TableRow>
              ))}
              {stats.top_paths.length === 0 && (
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
