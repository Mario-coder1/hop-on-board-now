import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDate } from '@/lib/datetime';
import { sk } from 'date-fns/locale';

interface Row { id: string; created_at: string; profile_id: string | null; detail: string | null; name?: string }

const AdminAutoCancelled = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('security_events')
        .select('id, created_at, profile_id, detail')
        .eq('event_type', 'ride_auto_cancelled')
        .order('created_at', { ascending: false })
        .limit(200);
      const list = (data ?? []) as Row[];
      const ids = [...new Set(list.map(r => r.profile_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        const map = new Map((profs ?? []).map(p => [p.id, p.full_name]));
        list.forEach(r => { r.name = map.get(r.profile_id ?? '') ?? '—'; });
      }
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const counts = rows.reduce<Record<string, number>>((a, r) => { const k = r.name ?? '—'; a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const repeat = Object.entries(counts).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-card border border-border">
        <h3 className="font-semibold mb-1">Automaticky zrušené jazdy</h3>
        <p className="text-sm text-muted-foreground">Jazdy s cestujúcimi, ktoré vodič nepotvrdil ani 1,5 h po otázke „Ide jazda?“.</p>
        {repeat.length > 0 && (
          <div className="mt-3 text-sm">
            <span className="font-medium text-destructive">Opakovane: </span>
            {repeat.map(([n, c]) => `${n} (${c}×)`).join(', ')}
          </div>
        )}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Načítavam…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatiaľ žiadne automaticky zrušené jazdy.</p>
      ) : rows.map(r => {
        let d: any = {};
        try { d = JSON.parse(r.detail ?? '{}'); } catch { /* ignore */ }
        return (
          <div key={r.id} className="p-4 rounded-xl bg-card border border-border text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{d.route ?? 'Jazda'}</span>
              <span className="text-muted-foreground">{formatDbDate(r.created_at, 'd. MMM HH:mm', { locale: sk })}</span>
            </div>
            <div className="text-muted-foreground mt-1">
              Vodič: {r.name} · Odchod: {d.departure_time ? formatDbDate(d.departure_time, 'd. MMM HH:mm', { locale: sk }) : '—'} · Cestujúci: {d.passengers ?? '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminAutoCancelled;
