import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, MapPin, ShieldCheck, Mail, ArrowRight, Loader2, Calendar, Euro, Users } from 'lucide-react';
import NavigationBar from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUniversities, useMyMemberships, type University } from '@/hooks/useUniversities';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface UniversityRide {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  university_id: string;
  driver_id: string;
  driver?: { full_name: string; avatar_url: string | null };
}

const Komunity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { universities, loading: uniLoading } = useUniversities();
  const { memberships, loading: memLoading, refresh } = useMyMemberships();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [rides, setRides] = useState<UniversityRide[]>([]);
  const [ridesLoading, setRidesLoading] = useState(false);

  // Load rides for all my universities
  useEffect(() => {
    const loadRides = async () => {
      if (memberships.length === 0) {
        setRides([]);
        return;
      }
      setRidesLoading(true);
      const universityIds = memberships.map((m) => m.university_id);
      const { data } = await supabase
        .from('rides')
        .select('id, origin_address, destination_address, departure_time, available_seats, price_per_seat, university_id, driver_id')
        .in('university_id', universityIds)
        .in('status', ['active', 'in_progress'])
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map((r) => r.driver_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', driverIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        const enriched = data.map((r) => ({
          ...r,
          driver: profileMap.get(r.driver_id) as { full_name: string; avatar_url: string | null } | undefined,
        }));
        setRides(enriched);
      } else {
        setRides([]);
      }
      setRidesLoading(false);
    };
    loadRides();
  }, [memberships]);

  const openVerify = (uni: University) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedUni(uni);
    setEmail('');
    setCode('');
    setStep('email');
    setVerifyOpen(true);
  };

  const sendCode = async () => {
    if (!selectedUni) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith(`@${selectedUni.email_domain}`)) {
      toast({
        title: 'Nesprávna doména',
        description: `Email musí končiť na @${selectedUni.email_domain}`,
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-university-code', {
      body: { university_id: selectedUni.id, email: trimmed },
    });
    setSending(false);
    if (error) {
      const msg = (error as { message?: string }).message || 'Nepodarilo sa poslať kód';
      toast({ title: 'Chyba', description: msg, variant: 'destructive' });
      return;
    }
    if (data?.error) {
      toast({ title: 'Chyba', description: data.error, variant: 'destructive' });
      return;
    }
    if (data?.dev_code) {
      toast({
        title: '🔑 Admin test kód',
        description: `Kód: ${data.dev_code} (zobrazené iba adminom)`,
        duration: 30000,
      });
      setCode(data.dev_code);
    } else {
      toast({
        title: 'Kód odoslaný 📧',
        description: data?.email_sent
          ? `Skontroluj si schránku ${trimmed}.`
          : 'Email služba ešte nie je nakonfigurovaná. Kontaktuj admina.',
      });
    }
    setStep('code');
  };

  const verifyCode = async () => {
    if (!selectedUni) return;
    if (!/^\d{6}$/.test(code.trim())) {
      toast({ title: 'Kód musí mať 6 číslic', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke('verify-university-code', {
      body: { university_id: selectedUni.id, email: email.trim().toLowerCase(), code: code.trim() },
    });
    setVerifying(false);
    if (error || data?.error) {
      toast({
        title: 'Chyba',
        description: data?.error || 'Nepodarilo sa overiť kód',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '✅ Overené!',
      description: `Vitaj v komunite ${selectedUni.short_name}.`,
    });
    setVerifyOpen(false);
    refresh();
  };

  const leaveMembership = async (membershipId: string, uniName: string) => {
    if (!confirm(`Naozaj chceš opustiť komunitu ${uniName}?`)) return;
    const { error } = await supabase.from('university_memberships').delete().eq('id', membershipId);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Opustil si komunitu' });
    refresh();
  };

  const isMember = (uniId: string) => memberships.some((m) => m.university_id === uniId);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Univerzitné komunity"
        description="Pridaj sa do komunity svojej univerzity a zdieľaj jazdy len so spolužiakmi."
        path="/komunity"
      />
      <NavigationBar />

      <div className="container mx-auto px-4 py-6 pb-32 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center shadow-cta">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">Univerzitné komunity</h1>
              <p className="text-muted-foreground text-sm">Zdieľaj jazdy iba so spolužiakmi.</p>
            </div>
          </div>
        </motion.div>

        {/* My memberships */}
        {memberships.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-8"
          >
            <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">
              Moje členstvá
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {memberships.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: m.university?.color || 'hsl(var(--primary))' }}
                    >
                      {m.university?.short_name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{m.university?.short_name}</p>
                        <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{m.verified_email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => leaveMembership(m.id, m.university?.short_name || 'univerzity')}>
                    Opustiť
                  </Button>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Available universities */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-8"
        >
          <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">
            Dostupné univerzity
          </h2>
          {uniLoading || memLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {universities.map((uni) => {
                const member = isMember(uni.id);
                return (
                  <div key={uni.id} className="p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: uni.color || 'hsl(var(--primary))' }}
                      >
                        {uni.short_name.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight">{uni.short_name}</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{uni.name}</p>
                        {uni.city && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {uni.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono">@{uni.email_domain}</Badge>
                      {member ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Člen
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openVerify(uni)}>
                          <Mail className="w-3.5 h-3.5 mr-1" />
                          Overiť
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* University rides feed */}
        {memberships.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-10"
          >
            <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">
              Jazdy v tvojej komunite
            </h2>
            {ridesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/30">
                <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Zatiaľ žiadne univerzitné jazdy.</p>
                <p className="text-xs text-muted-foreground mt-1">Buď prvý a vytvor jazdu pre svoju komunitu!</p>
                <Button size="sm" variant="outline" className="mt-4" asChild>
                  <Link to="/create-ride">Vytvoriť jazdu</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {rides.map((ride) => {
                  const uni = memberships.find((m) => m.university_id === ride.university_id)?.university;
                  return (
                    <Link
                      key={ride.id}
                      to={`/ride/${ride.id}`}
                      className="block p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {uni && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                              style={{ backgroundColor: uni.color || 'hsl(var(--primary))' }}
                            >
                              {uni.short_name}
                            </span>
                          )}
                          <p className="text-sm font-semibold truncate">{ride.driver?.full_name || 'Vodič'}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="text-sm text-foreground/90 mb-2">
                        <span className="font-medium">{ride.origin_address.split(',')[0]}</span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="font-medium">{ride.destination_address.split(',')[0]}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(ride.departure_time), 'd. MMM HH:mm', { locale: sk })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {ride.available_seats} miest
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {Number(ride.price_per_seat).toFixed(2)} €
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </div>

      {/* Verify Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Overenie {selectedUni?.short_name}
            </DialogTitle>
            <DialogDescription>
              {step === 'email'
                ? `Zadaj svoj školský email končiaci na @${selectedUni?.email_domain}.`
                : 'Zadaj 6-miestny kód, ktorý sme ti poslali na email.'}
            </DialogDescription>
          </DialogHeader>

          {step === 'email' ? (
            <div className="space-y-3">
              <Label htmlFor="uni-email">Školský email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="uni-email"
                  type="email"
                  placeholder={`meno@${selectedUni?.email_domain || 'univerzita.sk'}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setVerifyOpen(false)}>Zrušiť</Button>
                <Button onClick={sendCode} disabled={sending || !email}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Poslať kód'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="uni-code">Kód z emailu</Label>
              <Input
                id="uni-code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
              <p className="text-[11px] text-muted-foreground text-center">Kód platí 10 minút.</p>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setStep('email')}>Späť</Button>
                <Button onClick={verifyCode} disabled={verifying || code.length !== 6}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Overiť'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Komunity;
