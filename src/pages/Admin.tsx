import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification } from '@/hooks/usePushNotifications';
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
  MapPin
} from 'lucide-react';
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [rideStats, setRideStats] = useState({ total: 0, active: 0, inProgress: 0, completed: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data);
      }
    };

    if (!loading && user) {
      checkAdmin();
    } else if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch data when admin is confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchReports();
      fetchRideStats();
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

  if (loading || isAdmin === null) {
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="w-10 h-10 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-muted-foreground text-sm">Používatelia</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {reports.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-muted-foreground text-sm">Nahlásenia</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Ban className="w-10 h-10 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.banned).length}
                  </p>
                  <p className="text-muted-foreground text-sm">Zabanovaní</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Car className="w-10 h-10 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{rideStats.total}</p>
                  <p className="text-muted-foreground text-sm">Celkom jázd</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <MapPin className="w-10 h-10 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{rideStats.active + rideStats.inProgress}</p>
                  <p className="text-muted-foreground text-sm">Aktívne jazdy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">{rideStats.completed}</p>
                  <p className="text-muted-foreground text-sm">Dokončené</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Nahlásenia
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Používatelia
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;