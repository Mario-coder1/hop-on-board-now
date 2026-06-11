import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineUsersDetailed } from '@/hooks/useOnlineUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification } from '@/hooks/usePushNotifications';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Send,
  ArrowLeft,
  Star,
  Car,
  MapPin,
  Settings,
  Wallet,
  TrendingUp,
  Percent,
  Search,
  Trash2,
  Calendar,
  Key,
  UserX,
  Bell,
  Megaphone,
  BarChart3,
  Wifi,
  Fuel,
  ShieldCheck
} from 'lucide-react';
import VisitorsStats from '@/components/admin/VisitorsStats';
import AdminPayoutsTab from '@/components/admin/AdminPayoutsTab';
import AdminGasStations from '@/components/admin/AdminGasStations';
import AdminDisputes from '@/components/admin/AdminDisputes';
import { SecurityAuditTab } from '@/components/admin/SecurityAuditTab';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email?: string;
  rating: number | null;
  total_rides: number | null;
  selected_role: 'driver' | 'passenger' | null;
  banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
}

interface UserRide {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  status: string | null;
  available_seats: number;
  price_per_seat: number;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  ride_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter?: { full_name: string };
  reported_user?: { full_name: string; banned: boolean };
}

const Admin = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { onlineCount, onlineUsers } = useOnlineUsersDetailed();
  const [onlineDialogOpen, setOnlineDialogOpen] = useState(false);
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lastActiveMap, setLastActiveMap] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [rideStats, setRideStats] = useState({ total: 0, active: 0, inProgress: 0, completed: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Email search state
  const [emailSearch, setEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userRides, setUserRides] = useState<UserRide[]>([]);
  const [selectedUserForRides, setSelectedUserForRides] = useState<UserProfile | null>(null);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  
  // Mass notification state
  const [massNotificationTitle, setMassNotificationTitle] = useState('');
  const [massNotificationMessage, setMassNotificationMessage] = useState('');
  const [massNotificationLoading, setMassNotificationLoading] = useState(false);
  
  // Platform settings state
  const [commissionPercentage, setCommissionPercentage] = useState(10);
  const [topupFeePercentage, setTopupFeePercentage] = useState(2);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalTopupFees, setTotalTopupFees] = useState(0);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && !isAdmin) {
      navigate('/');
    }
  }, [user, loading, isAdmin, navigate]);

  // Fetch data when admin is confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchReports();
      fetchRideStats();
      fetchPlatformSettings();
      fetchRevenueStats();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
      // Fetch real last_sign_in_at via admin RPC (auth.users)
      const { data: activity, error: actErr } = await supabase
        .rpc('admin_get_user_activity' as any);
      if (actErr) {
        console.error('Error fetching user activity:', actErr);
      } else {
        const map: Record<string, string> = {};
        (activity as any[] || []).forEach((row) => {
          if (row.user_id && row.last_sign_in_at) {
            map[row.user_id] = row.last_sign_in_at;
          }
        });
        setLastActiveMap(map);
      }
    }
    setLoadingData(false);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(full_name),
        reported_user:profiles!reports_reported_user_id_fkey(full_name, banned)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
    }
  };

  const fetchRideStats = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select('status');

    if (error) {
      console.error('Error fetching rides:', error);
    } else {
      const rides = data || [];
      setRideStats({
        total: rides.length,
        active: rides.filter(r => r.status === 'active').length,
        inProgress: rides.filter(r => r.status === 'in_progress').length,
        completed: rides.filter(r => r.status === 'completed').length,
      });
    }
  };

  const fetchPlatformSettings = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      const commission = data.find(s => s.key === 'ride_commission_percent');
      const topup = data.find(s => s.key === 'stripe_fee_percent');
      if (commission) setCommissionPercentage(Number(commission.value));
      if (topup) setTopupFeePercentage(Number(topup.value));
    }
  };

  const fetchRevenueStats = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('type', ['commission', 'topup_fee']);

    if (error) {
      console.error('Error fetching revenue:', error);
    } else if (data) {
      const commissions = data
        .filter(t => t.type === 'commission')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      const topupFees = data
        .filter(t => t.type === 'topup_fee')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      
      setTotalCommissions(commissions);
      setTotalTopupFees(topupFees);
      setTotalRevenue(commissions + topupFees);
    }
  };

  const handleUpdateSettings = async () => {
    setSettingsLoading(true);
    try {
      const { error: commissionError } = await supabase
        .from('platform_settings')
        .update({ value: commissionPercentage })
        .eq('key', 'ride_commission_percent');

      const { error: topupError } = await supabase
        .from('platform_settings')
        .update({ value: topupFeePercentage })
        .eq('key', 'stripe_fee_percent');

      if (commissionError || topupError) {
        throw commissionError || topupError;
      }

      toast({
        title: 'Nastavenia uložené',
        description: 'Provízne nastavenia boli aktualizované.',
      });
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa uložiť nastavenia.',
        variant: 'destructive',
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleBanUser = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        banned: true, 
        banned_at: new Date().toISOString(),
        ban_reason: banReason || 'Porušenie pravidiel'
      })
      .eq('id', profileId);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zabanovať používateľa.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Používateľ zabanovaný',
        description: 'Používateľ bol úspešne zabanovaný.',
      });
      setBanReason('');
      fetchUsers();
      fetchReports();
    }
  };

  const handleUnbanUser = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        banned: false, 
        banned_at: null,
        ban_reason: null
      })
      .eq('id', profileId);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odbanovať používateľa.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Používateľ odbanovaný',
        description: 'Používateľ bol úspešne odbanovaný.',
      });
      fetchUsers();
      fetchReports();
    }
  };

  const handleSendNotification = async (profileId: string) => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte titulok aj správu.',
        variant: 'destructive',
      });
      return;
    }

    await sendPushNotification(profileId, pushTitle, pushMessage);
    
    toast({
      title: 'Notifikácia odoslaná',
      description: 'Push notifikácia bola odoslaná.',
    });
    
    setPushTitle('');
    setPushMessage('');
    setSelectedUserId(null);
  };

  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vyriešiť nahlásenie.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Nahlásenie vyriešené',
        description: 'Nahlásenie bolo označené ako vyriešené.',
      });
      fetchReports();
    }
  };

  const handleSearchByEmail = async () => {
    if (!emailSearch.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadajte email na vyhľadávanie.',
        variant: 'destructive',
      });
      return;
    }

    setSearchLoading(true);
    try {
      // Search in auth.users via admin API (we need to search profiles and match with auth)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // We need to get emails from auth - for now search by name containing email-like pattern
      // Since we can't directly access auth.users emails, we'll filter users whose user_id exists
      const matchingUsers = profiles?.filter(p => 
        p.full_name.toLowerCase().includes(emailSearch.toLowerCase()) ||
        p.phone?.includes(emailSearch)
      ) || [];

      setSearchResults(matchingUsers);
      
      if (matchingUsers.length === 0) {
        toast({
          title: 'Nenájdené',
          description: 'Žiadny používateľ nebol nájdený.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa vyhľadať.',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFetchUserRides = async (userProfile: UserProfile) => {
    setSelectedUserForRides(userProfile);
    setRidesLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', userProfile.id)
        .in('status', ['active', 'in_progress'])
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setUserRides(data || []);
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa načítať jazdy.',
        variant: 'destructive',
      });
    } finally {
      setRidesLoading(false);
    }
  };

  const handleDeleteRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .delete()
        .eq('id', rideId);

      if (error) throw error;

      toast({
        title: 'Jazda vymazaná',
        description: 'Jazda bola úspešne vymazaná.',
      });

      // Refresh rides list
      if (selectedUserForRides) {
        handleFetchUserRides(selectedUserForRides);
      }
      fetchRideStats();
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa vymazať jazdu.',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (userProfile: UserProfile) => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Chyba',
        description: 'Heslo musí mať aspoň 6 znakov.',
        variant: 'destructive',
      });
      return;
    }

    setPasswordResetLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'resetPassword',
          userId: userProfile.user_id,
          newPassword: newPassword
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Heslo zmenené',
        description: `Heslo pre ${userProfile.full_name} bolo úspešne zmenené.`,
      });
      setNewPassword('');
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa zmeniť heslo.',
        variant: 'destructive',
      });
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleDeleteUser = async (userProfile: UserProfile) => {
    setDeleteUserLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'deleteUser',
          userId: userProfile.user_id
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Používateľ vymazaný',
        description: `${userProfile.full_name} bol úspešne vymazaný.`,
      });
      
      // Refresh data
      fetchUsers();
      setSearchResults(prev => prev.filter(u => u.id !== userProfile.id));
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa vymazať používateľa.',
        variant: 'destructive',
      });
    } finally {
      setDeleteUserLoading(false);
    }
  };

  const handleSendMassNotification = async () => {
    if (!massNotificationTitle.trim() || !massNotificationMessage.trim()) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte titulok aj správu.',
        variant: 'destructive',
      });
      return;
    }

    setMassNotificationLoading(true);
    try {
      // Create a global notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: massNotificationTitle,
          message: massNotificationMessage,
          is_global: true,
          profile_id: null
        });

      if (error) throw error;

      // Send push notifications to all users via server-side edge function.
      // This is reliable and works even after admin closes the tab.
      const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-mass-push', {
        body: {
          title: massNotificationTitle,
          body: massNotificationMessage,
          data: { type: 'mass_notification' },
          tag: 'takeme-mass-notification',
        },
      });

      if (pushError) {
        console.error('[MassPush] edge function error:', pushError);
      }

      const recipients = (pushResult as { recipients?: number; sent?: number } | null)?.recipients ?? 0;
      const sent = (pushResult as { recipients?: number; sent?: number } | null)?.sent ?? 0;

      toast({
        title: 'Notifikácia odoslaná',
        description: `Push notifikácia doručená ${sent} zariadeniam (${recipients} používateľov).`,
      });

      setMassNotificationTitle('');
      setMassNotificationMessage('');
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa odoslať notifikáciu.',
        variant: 'destructive',
      });
    } finally {
      setMassNotificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Prístup zamietnutý</h1>
            <p className="text-muted-foreground mb-4">
              Nemáte oprávnenie na prístup do admin panelu.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na hlavnú stránku
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin panel" description="Administrátorský panel TakeMe." path="/admin" noindex />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          {[
            { icon: Users, value: users.length, label: 'Používatelia', from: 'from-indigo-500/15', to: 'to-indigo-500/5', ring: 'ring-indigo-500/20', iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
            { icon: Wifi, value: onlineCount, label: 'Online teraz · klikni', from: 'from-emerald-500/15', to: 'to-emerald-500/5', ring: 'ring-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', onClick: () => setOnlineDialogOpen(true), pulse: true },
            { icon: AlertTriangle, value: reports.filter(r => r.status === 'pending').length, label: 'Nahlásenia', from: 'from-amber-500/15', to: 'to-amber-500/5', ring: 'ring-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
            { icon: Ban, value: users.filter(u => u.banned).length, label: 'Zabanovaní', from: 'from-rose-500/15', to: 'to-rose-500/5', ring: 'ring-rose-500/20', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
            { icon: Car, value: rideStats.total, label: 'Celkom jázd', from: 'from-blue-500/15', to: 'to-blue-500/5', ring: 'ring-blue-500/20', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
            { icon: MapPin, value: rideStats.active + rideStats.inProgress, label: 'Aktívne jazdy', from: 'from-green-500/15', to: 'to-green-500/5', ring: 'ring-green-500/20', iconBg: 'bg-green-500/10', iconColor: 'text-green-500' },
            { icon: CheckCircle, value: rideStats.completed, label: 'Dokončené', from: 'from-teal-500/15', to: 'to-teal-500/5', ring: 'ring-teal-500/20', iconBg: 'bg-teal-500/10', iconColor: 'text-teal-500' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card
                key={i}
                onClick={s.onClick}
                className={`group relative overflow-hidden border-border/50 bg-gradient-to-br ${s.from} ${s.to} backdrop-blur-sm ring-1 ${s.ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${s.onClick ? 'cursor-pointer' : ''}`}
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
                <CardContent className="pt-6 relative">
                  <div className="flex items-center gap-4">
                    <div className={`relative w-12 h-12 rounded-2xl ${s.iconBg} flex items-center justify-center ring-1 ${s.ring} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${s.iconColor}`} />
                      {s.pulse && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold tabular-nums tracking-tight">{s.value}</p>
                      <p className="text-muted-foreground text-xs truncate">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="reports" className="space-y-4">
          <div className="-mx-2 px-2 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex h-auto w-auto gap-1.5 bg-muted/40 backdrop-blur-sm border border-border/50 rounded-full p-1.5 shadow-sm">
              {[
                { v: 'reports', icon: AlertTriangle, label: 'Nahlásenia' },
                { v: 'users', icon: Users, label: 'Používatelia' },
                { v: 'search', icon: Search, label: 'Vyhľadávanie' },
                { v: 'notifications', icon: Megaphone, label: 'Notifikácie' },
                { v: 'visitors', icon: BarChart3, label: 'Návštevnosť' },
                { v: 'payouts', icon: Wallet, label: 'Platby' },
                { v: 'settings', icon: Settings, label: 'Nastavenia' },
                { v: 'gas_stations', icon: Fuel, label: 'Stanice' },
                { v: 'disputes', icon: AlertTriangle, label: 'Reklamácie' },
                { v: 'audit', icon: ShieldCheck, label: 'Audit' },
              ].map(({ v, icon: Icon, label }) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:text-foreground whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="audit" className="space-y-4">
            <SecurityAuditTab />
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <AdminDisputes />
          </TabsContent>


          <TabsContent value="payouts" className="space-y-4">
            <AdminPayoutsTab />
          </TabsContent>

          <TabsContent value="visitors" className="space-y-4">
            <VisitorsStats />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            {loadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">Žiadne nahlásenia</p>
                </CardContent>
              </Card>
            ) : (
              reports.map((report) => (
                <Card key={report.id} className={report.status === 'resolved' ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Nahlásenie: {report.reported_user?.full_name || 'Neznámy'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {report.reported_user?.banned && (
                          <Badge variant="destructive">Zabanovaný</Badge>
                        )}
                        <Badge variant={report.status === 'pending' ? 'default' : 'secondary'}>
                          {report.status === 'pending' ? 'Čaká' : 'Vyriešené'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nahlásil:</span>{' '}
                        {report.reporter?.full_name || 'Neznámy'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dátum:</span>{' '}
                        {new Date(report.created_at).toLocaleDateString('sk-SK')}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dôvod:</span>{' '}
                      <span className="font-medium">{report.reason}</span>
                    </div>
                    {report.description && (
                      <div>
                        <span className="text-muted-foreground">Popis:</span>
                        <p className="mt-1">{report.description}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {!report.reported_user?.banned && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Ban className="w-4 h-4 mr-2" />
                              Zabanovať
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Zabanovať používateľa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Naozaj chcete zabanovať používateľa {report.reported_user?.full_name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                              placeholder="Dôvod banu (voliteľné)"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                            />
                            <AlertDialogFooter>
                              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleBanUser(report.reported_user_id)}
                              >
                                Zabanovať
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {report.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolveReport(report.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Označiť ako vyriešené
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {loadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              users.map((userProfile) => (
                <Card key={userProfile.id} className={userProfile.banned ? 'border-destructive' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {userProfile.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{userProfile.full_name}</p>
                            {userProfile.banned && (
                              <Badge variant="destructive">Zabanovaný</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{userProfile.phone || 'Bez telefónu'}</span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {userProfile.rating?.toFixed(1) || '5.0'}
                            </span>
                            <span>
                              {userProfile.selected_role === 'driver' ? 'Vodič' : 'Pasažier'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Registrácia: {new Date(userProfile.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Wifi className="w-3 h-3" />
                              Naposledy aktívny: {lastActiveMap[userProfile.id]
                                ? new Date(lastActiveMap[userProfile.id]).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </span>
                          </div>
                          {userProfile.ban_reason && (
                            <p className="text-sm text-destructive mt-1">
                              Ban: {userProfile.ban_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUserId(userProfile.id)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Notifikácia
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Poslať notifikáciu</DialogTitle>
                              <DialogDescription>
                                Pošlite push notifikáciu používateľovi {userProfile.full_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <Input
                                placeholder="Titulok"
                                value={pushTitle}
                                onChange={(e) => setPushTitle(e.target.value)}
                              />
                              <Textarea
                                placeholder="Správa"
                                value={pushMessage}
                                onChange={(e) => setPushMessage(e.target.value)}
                                rows={3}
                              />
                              <Button 
                                className="w-full"
                                onClick={() => handleSendNotification(userProfile.id)}
                              >
                                Odoslať
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {userProfile.banned ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Odbanovať
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Odbanovať používateľa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Naozaj chcete odbanovať používateľa {userProfile.full_name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleUnbanUser(userProfile.id)}
                                >
                                  Odbanovať
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Ban className="w-4 h-4 mr-2" />
                                Ban
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Zabanovať používateľa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Naozaj chcete zabanovať používateľa {userProfile.full_name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                placeholder="Dôvod banu (voliteľné)"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleBanUser(userProfile.id)}
                                >
                                  Zabanovať
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Vyhľadať používateľa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Zadajte meno alebo telefónne číslo..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchByEmail()}
                  />
                  <Button onClick={handleSearchByEmail} disabled={searchLoading}>
                    {searchLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Hľadať
                      </>
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <h3 className="font-medium">Výsledky vyhľadávania ({searchResults.length})</h3>
                    {searchResults.map((userProfile) => (
                      <Card key={userProfile.id} className={userProfile.banned ? 'border-destructive' : ''}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">
                                  {userProfile.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{userProfile.full_name}</p>
                                  {userProfile.banned && (
                                    <Badge variant="destructive">Zabanovaný</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{userProfile.phone || 'Bez telefónu'}</span>
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    {userProfile.rating?.toFixed(1) || '5.0'}
                                  </span>
                                  <span>
                                    {userProfile.selected_role === 'driver' ? 'Vodič' : 'Pasažier'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleFetchUserRides(userProfile)}
                                  >
                                    <Car className="w-4 h-4 mr-2" />
                                    Jazdy
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Aktívne jazdy - {selectedUserForRides?.full_name}</DialogTitle>
                                    <DialogDescription>
                                      Zoznam aktívnych jázd používateľa
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
                                    {ridesLoading ? (
                                      <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                      </div>
                                    ) : userRides.length === 0 ? (
                                      <div className="text-center py-8 text-muted-foreground">
                                        <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Žiadne aktívne jazdy</p>
                                      </div>
                                    ) : (
                                      userRides.map((ride) => (
                                        <Card key={ride.id}>
                                          <CardContent className="py-4">
                                            <div className="flex items-center justify-between">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <MapPin className="w-4 h-4 text-green-500" />
                                                  <span className="text-sm">{ride.origin_address}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <MapPin className="w-4 h-4 text-red-500" />
                                                  <span className="text-sm">{ride.destination_address}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(ride.departure_time).toLocaleString('sk-SK')}
                                                  </span>
                                                  <span>{ride.available_seats} miest</span>
                                                  <span>{ride.price_per_seat}€/miesto</span>
                                                  <Badge variant={ride.status === 'active' ? 'default' : 'secondary'}>
                                                    {ride.status === 'active' ? 'Aktívna' : 'V priebehu'}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="destructive" size="sm">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Vymazať
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Vymazať jazdu?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Naozaj chcete vymazať túto jazdu? Táto akcia je nezvratná.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                                    <AlertDialogAction
                                                      onClick={() => handleDeleteRide(ride.id)}
                                                    >
                                                      Vymazať
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {/* Reset Password Dialog */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Key className="w-4 h-4 mr-2" />
                                    Heslo
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Zmeniť heslo</DialogTitle>
                                    <DialogDescription>
                                      Nastavte nové heslo pre {userProfile.full_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-4">
                                    <Input
                                      type="password"
                                      placeholder="Nové heslo (min. 6 znakov)"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <Button 
                                      className="w-full"
                                      onClick={() => handleResetPassword(userProfile)}
                                      disabled={passwordResetLoading}
                                    >
                                      {passwordResetLoading ? 'Mením...' : 'Zmeniť heslo'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {/* Delete User Dialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <UserX className="w-4 h-4 mr-2" />
                                    Vymazať
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Vymazať používateľa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Naozaj chcete úplne vymazať používateľa {userProfile.full_name}? 
                                      Táto akcia je nezvratná a používateľ sa bude musieť znovu zaregistrovať.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(userProfile)}
                                      disabled={deleteUserLoading}
                                    >
                                      {deleteUserLoading ? 'Mažem...' : 'Vymazať používateľa'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              
                              {userProfile.banned ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUnbanUser(userProfile.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Odbanovať
                                </Button>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Ban className="w-4 h-4 mr-2" />
                                      Ban
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Zabanovať používateľa?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Naozaj chcete zabanovať používateľa {userProfile.full_name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Input
                                      placeholder="Dôvod banu (voliteľné)"
                                      value={banReason}
                                      onChange={(e) => setBanReason(e.target.value)}
                                    />
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleBanUser(userProfile.id)}
                                      >
                                        Zabanovať
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Hromadná notifikácia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Odošlite správu všetkým registrovaným používateľom. Notifikácia sa zobrazí v ich profile a tiež ako push notifikácia.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label>Titulok</Label>
                    <Input
                      placeholder="Napr. Nová aktualizácia aplikácie"
                      value={massNotificationTitle}
                      onChange={(e) => setMassNotificationTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Správa</Label>
                    <Textarea
                      placeholder="Napíšte správu pre všetkých používateľov..."
                      value={massNotificationMessage}
                      onChange={(e) => setMassNotificationMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleSendMassNotification}
                    disabled={massNotificationLoading}
                    className="w-full md:w-auto"
                  >
                    {massNotificationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Odosielam...
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4 mr-2" />
                        Odoslať všetkým ({users.length})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <TrendingUp className="w-10 h-10 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</p>
                      <p className="text-muted-foreground text-sm">Celkové výnosy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Percent className="w-10 h-10 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{totalCommissions.toFixed(2)} €</p>
                      <p className="text-muted-foreground text-sm">Z provízií</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Wallet className="w-10 h-10 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{totalTopupFees.toFixed(2)} €</p>
                      <p className="text-muted-foreground text-sm">Z poplatkov za dobíjanie</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Nastavenia provízií
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Provízna z jázd (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="50"
                        value={commissionPercentage}
                        onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pri každej platbe za jazdu si platforma strhne {commissionPercentage}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topup">Poplatok za dobíjanie (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="topup"
                        type="number"
                        min="0"
                        max="20"
                        value={topupFeePercentage}
                        onChange={(e) => setTopupFeePercentage(Number(e.target.value))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pri dobíjaní kreditu sa účtuje {topupFeePercentage}% poplatok
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateSettings}
                  disabled={settingsLoading}
                  className="w-full md:w-auto"
                >
                  {settingsLoading ? 'Ukladám...' : 'Uložiť nastavenia'}
                </Button>
              </CardContent>
            </Card>

            {/* Example calculations */}
            <Card>
              <CardHeader>
                <CardTitle>Príklad výpočtu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Jazda za 10€</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Pasažier zaplatí: <strong>10.00€</strong></li>
                      <li>Provízna platformy ({commissionPercentage}%): <strong>{(10 * commissionPercentage / 100).toFixed(2)}€</strong></li>
                      <li>Vodič dostane: <strong>{(10 - 10 * commissionPercentage / 100).toFixed(2)}€</strong></li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Dobíjanie 50€</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Používateľ zaplatí: <strong>{(50 + 50 * topupFeePercentage / 100).toFixed(2)}€</strong></li>
                      <li>Poplatok ({topupFeePercentage}%): <strong>{(50 * topupFeePercentage / 100).toFixed(2)}€</strong></li>
                      <li>Kredit na účte: <strong>50.00€</strong></li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gas_stations" className="space-y-4">
            <AdminGasStations />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={onlineDialogOpen} onOpenChange={setOnlineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-500" />
              Online používatelia ({onlineCount})
            </DialogTitle>
            <DialogDescription>
              Aktuálne pripojení používatelia (realtime presence).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {onlineUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">Nikto nie je online.</p>
            )}
            {onlineUsers.map((entry, idx) => {
              const profile = entry.profileId ? users.find(u => u.id === entry.profileId) : null;
              return (
                <div
                  key={(entry.profileId || 'anon') + idx}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profile?.full_name || (entry.profileId ? 'Neznámy používateľ' : 'Anonymný návštevník')}
                    </p>
                    {profile?.email && (
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    online
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;