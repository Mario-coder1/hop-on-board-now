import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hand, Trash2, Car, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Wish {
  id: string; passenger_id: string; origin_text: string; destination_text: string;
  travel_date: string; seats: number; note: string | null; active: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function RideWishes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [form, setForm] = useState({ origin: '', destination: '', date: today(), seats: 1, note: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('ride_wishes').select('*')
      .eq('active', true).gte('travel_date', today()).order('travel_date').limit(100);
    setWishes((data ?? []) as Wish[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (form.origin.trim().length < 2 || form.destination.trim().length < 2) {
      toast({ title: 'Vyplň odkiaľ a kam', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await supabase.from('ride_wishes').insert({
      passenger_id: profile.id, origin_text: form.origin.trim(), destination_text: form.destination.trim(),
      travel_date: form.date, seats: form.seats, note: form.note.trim() || null,
    });
    if (!error) {
      // Upozornenie pre cestujúceho, keď niekto vytvorí zodpovedajúcu jazdu
      await supabase.from('route_alerts').insert({
        passenger_id: profile.id, origin_text: form.origin.trim(), destination_text: form.destination.trim(),
      });
    }
    setSaving(false);
    if (error) { toast({ title: 'Chyba', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Zverejnené', description: 'Vodiči na tejto trase dostali upozornenie. Dáme ti vedieť, keď pribudne jazda.' });
    setForm({ origin: '', destination: '', date: today(), seats: 1, note: '' });
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from('ride_wishes').delete().eq('id', id);
    void load();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="Hľadám odvoz – TakeMe" description="Napíš, kam potrebuješ ísť, a vodiči na tvojej trase dostanú upozornenie." />
      <Navigation />
      <div className="container max-w-2xl mx-auto px-4 pt-20 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Hand className="w-6 h-6 text-primary" />Hľadám odvoz</h1>
          <p className="text-muted-foreground text-sm mt-1">Nenašiel si jazdu? Napíš, kam ideš. Vodiči na trase dostanú upozornenie.</p>
        </div>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={submit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Odkiaľ (napr. Žilina)" value={form.origin} maxLength={120} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
                <Input placeholder="Kam (napr. Bratislava)" value={form.destination} maxLength={120} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                <Input type="date" min={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <Input type="number" min={1} max={8} value={form.seats} aria-label="Počet miest"
                  onChange={(e) => setForm({ ...form, seats: Math.min(8, Math.max(1, Number(e.target.value) || 1)) })} />
              </div>
              <Textarea placeholder="Poznámka (napr. čas, batožina)" maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <Button type="submit" className="w-full" disabled={saving}>Zverejniť požiadavku</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold">Ľudia hľadajú odvoz</h2>
          {wishes.length === 0 && <p className="text-sm text-muted-foreground">Zatiaľ nikto. Buď prvý.</p>}
          {wishes.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium break-words">{w.origin_text} → {w.destination_text}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    {new Date(w.travel_date).toLocaleDateString('sk-SK')}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{w.seats}</span>
                  </div>
                  {w.note && <p className="text-sm mt-1 break-words">{w.note}</p>}
                </div>
                {w.passenger_id === profile?.id ? (
                  <Button variant="ghost" size="icon" aria-label="Zmazať" onClick={() => remove(w.id)}><Trash2 className="w-4 h-4" /></Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link to="/create-ride"><Car className="w-4 h-4 mr-1" />Ponúknuť jazdu</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
