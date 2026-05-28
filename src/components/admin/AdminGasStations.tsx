import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Fuel, Plus, Trash2, MapPin, Percent, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AddressSearch from '@/components/AddressSearch';

interface GasStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  logo_url: string | null;
  discount_note: string | null;
  active: boolean;
}

const AdminGasStations = () => {
  const { toast } = useToast();
  const [stations, setStations] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newStation, setNewStation] = useState({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    discount_note: '',
    logo_url: '',
  });

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from('gas_stations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setStations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleAdd = async () => {
    if (!newStation.name || !newStation.address || !newStation.lat || !newStation.lng) {
      toast({ title: 'Chyba', description: 'Vyplň názov, adresu a polohu.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('gas_stations').insert({
      name: newStation.name,
      address: newStation.address,
      lat: newStation.lat,
      lng: newStation.lng,
      discount_note: newStation.discount_note || null,
      logo_url: newStation.logo_url || null,
      active: true,
    });
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pridané', description: 'Čerpacia stanica bola pridaná.' });
      setAddOpen(false);
      setNewStation({ name: '', address: '', lat: 0, lng: 0, discount_note: '', logo_url: '' });
      fetchStations();
    }
    setSaving(false);
  };

  const toggleActive = async (station: GasStation) => {
    const { error } = await supabase
      .from('gas_stations')
      .update({ active: !station.active })
      .eq('id', station.id);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      fetchStations();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('gas_stations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vymazané', description: 'Čerpacia stanica bola vymazaná.' });
      fetchStations();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Čerpacie stanice</h2>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1">
              <Plus className="w-4 h-4" />
              Pridať
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pridať partnerskú čerpaciu stanicu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Názov stanice</Label>
                <Input
                  value={newStation.name}
                  onChange={(e) => setNewStation((p) => ({ ...p, name: e.target.value }))}
                  placeholder="napr. Slovnaft Bratislava"
                />
              </div>
              <div>
                <Label>Adresa</Label>
                <AddressSearch
                  value={newStation.address}
                  onSelect={(address, lat, lng) =>
                    setNewStation((p) => ({ ...p, address, lat, lng }))
                  }
                  placeholder="Hľadať adresu stanice..."
                />
              </div>
              <div>
                <Label>Zľava / ponuka pre vodičov</Label>
                <Input
                  value={newStation.discount_note}
                  onChange={(e) => setNewStation((p) => ({ ...p, discount_note: e.target.value }))}
                  placeholder="napr. -5 centov na liter"
                />
              </div>
              <div>
                <Label>URL loga (voliteľné)</Label>
                <Input
                  value={newStation.logo_url}
                  onChange={(e) => setNewStation((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full rounded-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pridať stanicu'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Fuel className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Žiadne partnerské čerpacie stanice</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stations.map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all ${
                s.active ? 'bg-card border-border' : 'bg-muted/50 border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="w-8 h-8 rounded object-contain shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Fuel className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm tracking-tight truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {s.address}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {s.discount_note && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium mt-2">
                  <Percent className="w-3 h-3" />
                  {s.discount_note}
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  {s.active ? 'Aktívna' : 'Neaktívna'}
                </span>
                <button
                  onClick={() => toggleActive(s)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    s.active
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.active ? 'Deaktivovať' : 'Aktivovať'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGasStations;