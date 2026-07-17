import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, Car, FileText, Save, Star, Shield, Scale, Trash2, MessageCircle, Bell, Check, X, ChevronDown, ChevronUp, Mail, LogOut, Camera, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Navigation from '@/components/Navigation';
import VehiclesManager from '@/components/VehiclesManager';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';
import { BADGE_TIERS, getEarnedBadges } from '@/lib/badges';
import { ColdStartCard } from '@/components/ColdStartCard';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  is_global: boolean;
  created_at: string;
}

const Profile = () => {
  const { profile, refreshProfile, updateRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
      fetchNotifications();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;
    
    setNotificationsLoading(true);
    try {
      // Fetch user-specific and global notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`profile_id.eq.${profile.id},is_global.eq.true`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get read global notifications
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('profile_id', profile.id);

      const readIds = new Set(reads?.map(r => r.notification_id) || []);

      // Mark global notifications as read if they're in the reads table
      const processedNotifications = (data || []).map(n => ({
        ...n,
        is_read: n.is_global ? readIds.has(n.id) : n.is_read
      }));

      setNotifications(processedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (notification: Notification) => {
    if (!profile) return;

    try {
      if (notification.is_global) {
        // Insert into notification_reads for global notifications
        await supabase
          .from('notification_reads')
          .insert({
            notification_id: notification.id,
            profile_id: profile.id
          });
      } else {
        // Update the notification directly for user-specific ones
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
      }

      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      for (const notification of unreadNotifications) {
        if (notification.is_global) {
          await supabase
            .from('notification_reads')
            .insert({
              notification_id: notification.id,
              profile_id: profile.id
            });
        } else {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification.id);
        }
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      toast({
        title: 'Hotovo',
        description: 'Všetky notifikácie boli označené ako prečítané.',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleRoleChange = async (newRole: 'driver' | 'passenger') => {
    if (!profile || newRole === profile.selected_role) return;

    setRoleLoading(true);

    try {
      await updateRole(newRole);
      await refreshProfile();

      toast({
        title: 'Rola zmenená',
        description: `Si teraz ${newRole === 'driver' ? 'vodič' : 'cestujúci'}.`,
      });

      navigate(newRole === 'driver' ? '/driver' : '/passenger');
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Neplatný súbor',
        description: 'Prosím, nahrajte obrázok.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Súbor je príliš veľký',
        description: 'Maximálna veľkosť je 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.user_id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: 'Hotovo!',
        description: 'Profilová fotka bola zmenená.',
      });
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa nahrať fotku.',
        variant: 'destructive'
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;

    setDeleteLoading(true);
    try {
      // Delete profile (cascades to related data via foreign keys)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: 'Účet vymazaný',
        description: 'Váš účet bol úspešne odstránený.',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa vymazať účet.',
        variant: 'destructive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Môj profil" description="Profil používateľa TakeMe — nastavenia, vozidlá, hodnotenia a notifikácie." path="/profile" noindex />
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 overflow-x-hidden">
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
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                  />
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-semibold">{profile.full_name}</h2>
                  <RideBadge totalRides={profile.total_rides} size="sm" showLabel />
                  {(profile as any).badge && (
                    <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 text-xs">
                      {(profile as any).badge}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    {profile.rating?.toFixed(1) ?? 'N/A'}
                  </span>
                  <span>{profile.total_rides} jázd</span>
                  <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    {profile.selected_role === 'driver' ? 'Vodič' : 'Cestujúci'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <Label className="text-sm text-muted-foreground mb-2 block">Vyber svoju rolu</Label>
              <Select
                value={profile.selected_role}
                onValueChange={(value) => handleRoleChange(value as 'driver' | 'passenger')}
                disabled={roleLoading}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Vyber rolu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Vodič
                    </div>
                  </SelectItem>
                  <SelectItem value="passenger">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Cestujúci
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Achievements / Auto-earned badges */}
            <div className="mt-5 pt-5 border-t border-border">
              <Label className="text-sm text-muted-foreground mb-3 block">
                🏆 Úspechy ({getEarnedBadges(profile.total_rides).length}/{BADGE_TIERS.length})
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {BADGE_TIERS.map((tier) => {
                  const earned = (profile.total_rides ?? 0) >= tier.threshold;
                  return (
                    <div
                      key={tier.threshold}
                      title={`${tier.label} — ${tier.description}`}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        earned
                          ? `bg-gradient-to-br ${tier.gradient} border-transparent shadow-md`
                          : 'bg-muted/40 border-border opacity-50 grayscale'
                      }`}
                    >
                      <span className="text-xl leading-none">{tier.emoji}</span>
                      <span className={`text-[9px] font-semibold mt-1 leading-tight ${earned ? 'text-white' : 'text-muted-foreground'}`}>
                        {tier.label}
                      </span>
                      <span className={`text-[8px] tabular-nums ${earned ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {tier.threshold}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Odznaky získavaš automaticky za počet dokončených jázd. Najvyšší sa zobrazí pri tvojom mene.
              </p>
            </div>

            {/* Push Notifications */}
            <div className="mt-5 pt-5 border-t border-border">
              <Label className="text-sm text-muted-foreground mb-2 block">Push notifikácie</Label>
              <PushNotificationToggle />
              <p className="text-xs text-muted-foreground mt-2">
                Dostávajte upozornenia aj keď je aplikácia zatvorená.
              </p>
            </div>

            {/* Public Chat Link */}
            <div className="mt-5 pt-5 border-t border-border">
              <Button 
                onClick={() => navigate('/chat')} 
                variant="outline" 
                className="w-full gap-2 group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Verejný chat
                <span className="ml-auto text-xs text-muted-foreground group-hover:text-primary-foreground/70">
                  Chatuj s ostatnými
                </span>
              </Button>
            </div>

            {/* Logout Button */}
            <div className="mt-5 pt-5 border-t border-border">
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }} 
                variant="outline" 
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                Odhlásiť sa
              </Button>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl bg-card border border-border mb-6 overflow-hidden">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <span className="font-display font-semibold">Upozornenia</span>
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <Badge variant="destructive">
                    {notifications.filter(n => !n.is_read).length}
                  </Badge>
                )}
              </div>
              {notificationsOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {notificationsOpen && (
              <div className="px-4 pb-4 border-t border-border">
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <div className="flex justify-end pt-3">
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                      <Check className="w-4 h-4 mr-1" />
                      Označiť všetky
                    </Button>
                  </div>
                )}
                
                {notificationsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Žiadne upozornenia
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pt-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          notification.is_read 
                            ? 'bg-muted/50 border-border' 
                            : 'bg-primary/5 border-primary/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full bg-primary" />
                              )}
                              {notification.is_global && (
                                <Badge variant="secondary" className="text-xs">
                                  Všeobecné
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.created_at).toLocaleDateString('sk-SK', {
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markNotificationAsRead(notification)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

          {/* Vehicles (for drivers) */}
          {profile.selected_role === 'driver' && (
            <VehiclesManager profileId={profile.id} />
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

          {/* Support */}
          <div className="p-6 rounded-2xl bg-card border border-border mt-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Podpora
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Máte otázky alebo potrebujete pomoc? Kontaktujte nás cez WhatsApp.
            </p>
            <a
              href="https://wa.me/message/RVYLKZFAFEYVP1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              Napísať na WhatsApp
            </a>
          </div>

          {/* AI Assistant */}
          <Link
            to="/ai-assistant"
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/30 mt-6 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold">AI asistent</div>
                <div className="text-xs text-muted-foreground">Opýtaj sa čokoľvek o TakeMe</div>
              </div>
            </div>
            <ChevronUp className="w-5 h-5 text-muted-foreground rotate-90" />
          </Link>

          {profile.selected_role === 'driver' && <ColdStartCard />}

          {/* Tutorial Link */}
          <Link
            to="/tutorial"
            className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border mt-6 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Tutoriál — Ako používať TakeMe</div>
                <div className="text-xs text-muted-foreground">Kroky pre vodiča aj pasažiera so snímkami</div>
              </div>
            </div>
            <ChevronUp className="w-5 h-5 text-muted-foreground rotate-90" />
          </Link>

          {/* Legal Links */}
          <div className="p-6 rounded-2xl bg-card border border-border mt-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Právne informácie
            </h3>
            <div className="space-y-3">
              <Link
                to="/privacy"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span>Zásady ochrany súkromia</span>
              </Link>
              <Link
                to="/terms"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span>Obchodné podmienky</span>
              </Link>
              <Link
                to="/gdpr"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Scale className="w-5 h-5 text-muted-foreground" />
                <span>GDPR - Vaše práva</span>
              </Link>
              <a
                href="mailto:support@takeme.sk"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span>support@takeme.sk</span>
              </a>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20 mt-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Nebezpečná zóna
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vymazanie účtu je nevratné. Všetky vaše údaje, jazdy a hodnotenia budú natrvalo odstránené.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteLoading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteLoading ? 'Mazanie...' : 'Vymazať účet'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Naozaj chcete vymazať účet?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Táto akcia je nevratná. Váš profil, všetky jazdy, hodnotenia a ostatné údaje budú natrvalo odstránené.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Áno, vymazať účet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;