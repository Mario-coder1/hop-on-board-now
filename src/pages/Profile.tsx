import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, Car, FileText, Save, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { profile, refreshProfile, updateRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    car_model: '',
    car_color: '',
    license_plate: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        car_model: profile.car_model || '',
        car_color: profile.car_color || '',
        license_plate: profile.license_plate || ''
      });
    }
  }, [profile]);

  const handleSwitchRole = async () => {
    if (!profile) return;

    const nextRole = profile.selected_role === 'driver' ? 'passenger' : 'driver';
    setRoleLoading(true);

    try {
      await updateRole(nextRole);
      await refreshProfile();

      toast({
        title: 'Rola zmenená',
        description: `Si teraz ${nextRole === 'driver' ? 'vodič' : 'cestujúci'}.`,
      });

      navigate(nextRole === 'driver' ? '/driver' : '/passenger');
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error?.message || 'Nepodarilo sa zmeniť rolu.',
        variant: 'destructive'
      });
    } finally {
      setRoleLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: 'Uložené!',
        description: 'Profil bol úspešne aktualizovaný.',
      });
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>

          <h1 className="font-display text-3xl font-bold mb-8">Môj profil</h1>

          {/* Profile Header */}
          <div className="p-6 rounded-2xl bg-card border border-border mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${profile.full_name} profilová fotka`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">{profile.full_name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{profile.full_name}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    {profile.rating.toFixed(1)}
                  </span>
                  <span>{profile.total_rides} jázd</span>
                  <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    {profile.selected_role === 'driver' ? 'Vodič' : 'Cestujúci'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Ak chceš vidieť funkcie pre druhú rolu, prepni sa tu.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleSwitchRole}
                disabled={roleLoading}
              >
                {profile.selected_role === 'driver' ? <User /> : <Car />}
                {roleLoading
                  ? 'Prepínam...'
                  : `Prepnúť na ${profile.selected_role === 'driver' ? 'cestujúceho' : 'vodiča'}`}
              </Button>
            </div>
          </div>

          {/* Personal Info */}
          <div className="p-6 rounded-2xl bg-card border border-border mb-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Osobné údaje
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Celé meno</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Vaše meno"
                />
              </div>
              
              <div>
                <Label>Telefón</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+421 XXX XXX XXX"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label>O mne</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Napíšte niečo o sebe..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Car Info (for drivers) */}
          {profile.selected_role === 'driver' && (
            <div className="p-6 rounded-2xl bg-card border border-border mb-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Informácie o vozidle
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Model auta</Label>
                    <Input
                      value={formData.car_model}
                      onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                      placeholder="Napr. Škoda Octavia"
                    />
                  </div>
                  <div>
                    <Label>Farba</Label>
                    <Input
                      value={formData.car_color}
                      onChange={(e) => setFormData({ ...formData, car_color: e.target.value })}
                      placeholder="Napr. Biela"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>ŠPZ</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={formData.license_plate}
                      onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                      placeholder="XX-XXXXX"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Ukladám...' : 'Uložiť zmeny'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;