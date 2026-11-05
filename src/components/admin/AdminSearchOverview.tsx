import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, SearchX, Users, CheckCircle } from 'lucide-react';

interface Overview {
  searches: number;
  search_sessions: number;
  no_results: number;
  requests: number;
  confirmed: number;
  tracking_since: string | null;
  daily: { day: string; searches: number; no_results: number; requests: number }[];
  sources: { source: string; searches: number; no_results: number }[];
}
const sources: Record<string, string> = { search: 'Hľadanie jázd', passenger: 'Stránka cestujúceho', airport: 'Letiskové jazdy' };

export default function AdminSearchOverview() {
  const [days, setDays] = useState('7');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data: result, error: failure } = await supabase.rpc('admin_search_overview', { p_days: Number(days) });
    if (failure) setError(true);
    else setData(result as unknown as Overview);
    setLoading(false);
  }, [days]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <section className="space-y-6" aria-label="Hľadania a rezervácie">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Hľadania a rezervácie</h2>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-44" aria-label="Obdobie prehľadu"><SelectValue /></SelectTrigger>
            <SelectContent>{['7', '30', '90'].map(d => <SelectItem key={d} value={d}>Posledných {d} dní</SelectItem>)}</SelectContent>
          </Select>
          <Button size="icon" variant="outline" onClick={() => void load()} disabled={loading} aria-label="Obnoviť prehľad" title="Obnoviť prehľad"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>
      {error ? <div role="alert" className="text-destructive">Prehľad sa nepodarilo načítať. Skúste ho obnoviť.</div> : !data ? <p className="text-muted-foreground" role="status">Načítavam prehľad…</p> : <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { icon: Search, label: 'Hľadania', value: data.searches },
            { icon: Users, label: 'Relácie s hľadaním', value: data.search_sessions },
            { icon: SearchX, label: 'Bez výsledku', value: data.no_results },
            { icon: CheckCircle, label: 'Odoslané žiadosti', value: data.requests },
          ].map(({ icon: Icon, label, value }) => <Card key={label}><CardContent className="p-4"><Icon className="h-5 w-5 text-primary mb-3" /><p className="text-2xl font-bold tabular-nums">{value.toLocaleString('sk-SK')}</p><p className="text-sm text-muted-foreground break-words">{label}</p></CardContent></Card>)}
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <p>Podiel hľadaní bez výsledku: <strong>{data.searches ? Math.round(data.no_results / data.searches * 100) : 0} %</strong></p>
          <p>Prijaté rezervácie: <strong>{data.confirmed}</strong></p>
        </div>
        <p className="text-sm text-muted-foreground">{data.tracking_since ? `Hľadania sa merajú od ${new Date(data.tracking_since).toLocaleDateString('sk-SK')}.` : 'Meranie hľadaní je zapnuté; zatiaľ nie sú zaznamenané žiadne hľadania.'} Započítavajú sa len hľadania so súhlasom s analytikou, nie všetci návštevníci. Relácia neznamená jedného človeka. Žiadosti a prijaté rezervácie sú samostatné počty zo zachovaných záznamov, nie konverzia konkrétneho hľadania.</p>
        <div>
          <h3 className="font-semibold mb-3">Kde ľudia hľadali</h3>
          {data.sources.length === 0 ? <p className="text-sm text-muted-foreground">Zatiaľ bez údajov.</p> : <Table><TableHeader><TableRow><TableHead>Miesto</TableHead><TableHead className="text-right">Hľadania</TableHead><TableHead className="text-right">Bez výsledku</TableHead></TableRow></TableHeader><TableBody>{data.sources.map(s => <TableRow key={s.source}><TableCell>{sources[s.source] || s.source}</TableCell><TableCell className="text-right tabular-nums">{s.searches}</TableCell><TableCell className="text-right tabular-nums">{s.no_results}</TableCell></TableRow>)}</TableBody></Table>}
        </div>
        <div>
          <h3 className="font-semibold mb-3">Po jednotlivých dňoch</h3>
          <Table><TableHeader><TableRow><TableHead>Dátum</TableHead><TableHead className="text-right">Hľadania</TableHead><TableHead className="text-right">Bez výsledku</TableHead><TableHead className="text-right">Žiadosti</TableHead></TableRow></TableHeader><TableBody>{[...data.daily].reverse().map(d => <TableRow key={d.day}><TableCell className="whitespace-nowrap">{new Date(`${d.day}T12:00:00`).toLocaleDateString('sk-SK')}</TableCell><TableCell className="text-right tabular-nums">{d.searches}</TableCell><TableCell className="text-right tabular-nums">{d.no_results}</TableCell><TableCell className="text-right tabular-nums">{d.requests}</TableCell></TableRow>)}</TableBody></Table>
        </div>
      </>}
    </section>
  );
}