import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Plus, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RouteAlert {
  id: string;
  origin_text: string;
  destination_text: string;
  max_price: number | null;
  active: boolean;
}

interface RouteAlertsProps {
  prefilledOrigin?: string;
  prefilledDestination?: string;
}

const RouteAlerts = ({ prefilledOrigin = '', prefilledDestination = '' }: RouteAlertsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<RouteAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [origin, setOrigin] = useState(prefilledOrigin);
  const [destination, setDestination] = useState(prefilledDestination);
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    setOrigin(prefilledOrigin);
    setDestination(prefilledDestination);
  }, [prefilledOrigin, prefilledDestination]);

  const fetchAlerts = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('route_alerts')
      .select('*')
      .eq('passenger_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[route_alerts] fetch error', error);
      setAlerts([]);
    } else {
      setAlerts((data ?? []) as RouteAlert[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [profile?.id]);

  const handleCreate = async () => {
    if (!profile) return;
    if (!origin.trim() || !destination.trim()) {
      toast({ title: 'Chyba', description: 'Zadaj odkiaľ aj kam.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('route_alerts').insert({
      passenger_id: profile.id,
      origin_text: origin.trim(),
      destination_text: destination.trim(),
      max_price: maxPrice ? Number(maxPrice) : null,
      active: true,
    });
    setCreating(false);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '🔔 Alert vytvorený', description: 'Pošleme ti push, keď niekto vypíše jazdu na tejto trase.' });
    setMaxPrice('');
    setShowForm(false);
    fetchAlerts();
  };

  const toggleActive = async (alert: RouteAlert) => {
    const { error } = await supabase
      .from('route_alerts')
      .update({ active: !alert.active })
      .eq('id', alert.id);
    if (!error) fetchAlerts();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('route_alerts').delete().eq('id', id);
    if (!error) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Alerty na trasy
            {alerts.filter(a => a.active).length > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {alerts.filter(a => a.active).length} aktívnych
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Dostávaj push notifikáciu, keď niekto vypíše jazdu na tvojej obľúbenej trase.
          </p>
        </div>
        <Button
          size="sm"
          variant={showForm ? 'outline' : 'default'}
          onClick={() => setShowForm(!showForm)}
          className="shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" />Pridať</>}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-border">
              <div className="space-y-1.5">
                <Label className="text-xs">Odkiaľ</Label>
                <Input
                  placeholder="napr. Bratislava"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kam</Label>
                <Input
                  placeholder="napr. Košice"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5" />
                  Max. cena (voliteľné)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="napr. 15"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !origin.trim() || !destination.trim()}
                className="sm:col-span-2"
              >
                {creating ? 'Ukladám…' : 'Vytvoriť alert'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && alerts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${
                a.active ? 'border-border bg-background' : 'border-border bg-muted/40 opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {a.origin_text} → {a.destination_text}
                </div>
                {a.max_price !== null && (
                  <div className="text-[11px] text-muted-foreground">do {a.max_price} €</div>
                )}
              </div>
              <button
                onClick={() => toggleActive(a)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title={a.active ? 'Vypnúť' : 'Zapnúť'}
              >
                {a.active ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button
                onClick={() => remove(a.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                title="Zmazať"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RouteAlerts;
