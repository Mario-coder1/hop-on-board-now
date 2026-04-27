import { useEffect, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Car, Plus, Trash2, Star, FileText, Palette, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  label: string | null;
  car_model: string;
  car_color: string | null;
  license_plate: string | null;
  is_default: boolean;
  created_at: string;
}

interface VehiclesManagerProps {
  profileId: string;
}

const emptyForm = { label: '', car_model: '', car_color: '', license_plate: '' };

const VehiclesManager = ({ profileId }: VehiclesManagerProps) => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (profileId) fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[VehiclesManager] fetch error', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať autá.', variant: 'destructive' });
    } else {
      setVehicles((data ?? []) as Vehicle[]);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.car_model.trim()) {
      toast({ title: 'Chýba model', description: 'Zadajte model auta.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('vehicles').insert({
      profile_id: profileId,
      label: form.label.trim() || null,
      car_model: form.car_model.trim(),
      car_color: form.car_color.trim() || null,
      license_plate: form.license_plate.trim() || null,
      is_default: vehicles.length === 0, // first vehicle is default
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa pridať auto.', variant: 'destructive' });
      return;
    }
    toast({ title: '🚗 Auto pridané', description: 'Nové auto bolo pridané.' });
    setForm(emptyForm);
    setShowForm(false);
    fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa zmazať auto.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Auto zmazané' });
    fetchVehicles();
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ is_default: true })
      .eq('id', id);
    if (error) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa nastaviť predvolené auto.', variant: 'destructive' });
      return;
    }
    fetchVehicles();
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          Moje autá
          {vehicles.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
              {vehicles.length}
            </Badge>
          )}
        </h3>
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => {
            setShowForm(v => !v);
            setForm(emptyForm);
          }}
        >
          <motion.span
            key={showForm ? 'close' : 'add'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          </motion.span>
          {showForm ? 'Zrušiť' : 'Pridať'}
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            key="form"
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 mb-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <Label className="text-xs">Názov (voliteľné)</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Napr. Mestské auto"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Model *</Label>
                  <Input
                    value={form.car_model}
                    onChange={(e) => setForm({ ...form, car_model: e.target.value })}
                    placeholder="Škoda Octavia"
                  />
                </div>
                <div>
                  <Label className="text-xs">Farba</Label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={form.car_color}
                      onChange={(e) => setForm({ ...form, car_color: e.target.value })}
                      placeholder="Biela"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">ŠPZ</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={form.license_plate}
                    onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
                    placeholder="XX-XXXXX"
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="hero"
                size="sm"
                onClick={handleAdd}
                disabled={saving}
                className="w-full"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                Uložiť auto
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vehicle list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 px-4 rounded-xl bg-muted/30 border border-dashed border-border"
        >
          <Car className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Zatiaľ nemáte pridané žiadne auto.
          </p>
        </motion.div>
      ) : (
        <LayoutGroup>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {vehicles.map((v) => (
                <motion.li
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  whileHover={{ y: -2 }}
                  className={`relative p-4 rounded-xl border transition-colors ${
                    v.is_default
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <motion.div
                        whileHover={{ rotate: [0, -8, 8, -4, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          v.is_default ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Car className="w-5 h-5" />
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">
                            {v.label || v.car_model}
                          </p>
                          <AnimatePresence>
                            {v.is_default && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                              >
                                <Badge className="h-5 text-[10px] gap-1 bg-primary">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  Predvolené
                                </Badge>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {v.label && (
                          <p className="text-xs text-muted-foreground truncate">{v.car_model}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {v.car_color && (
                            <span className="flex items-center gap-1">
                              <Palette className="w-3 h-3" />
                              {v.car_color}
                            </span>
                          )}
                          {v.license_plate && (
                            <span className="flex items-center gap-1 font-mono tracking-wider px-1.5 py-0.5 rounded bg-muted">
                              {v.license_plate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      {!v.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSetDefault(v.id)}
                          title="Nastaviť ako predvolené"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(v.id)}
                        title="Zmazať"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </LayoutGroup>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        Pridajte všetky autá, ktorými jazdíte. Predvolené auto sa použije pri nových jazdách.
      </p>
    </div>
  );
};

export default VehiclesManager;
