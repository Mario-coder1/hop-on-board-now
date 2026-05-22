import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet as WalletIcon, Send, Clock, CheckCircle, XCircle, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number | null;
  description: string | null;
  created_at: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  bank_iban: string | null;
  note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  const load = async () => {
    if (!profile) return;
    setLoading(true);

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance, pending_payout_amount')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (wallet) {
      setWalletId(wallet.id);
      setBalance(Number(wallet.balance) || 0);
      setPendingPayout(Number(wallet.pending_payout_amount) || 0);

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions((txs as Transaction[]) || []);
    }

    const { data: po } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('driver_id', profile.id)
      .order('created_at', { ascending: false });
    setPayouts((po as PayoutRequest[]) || []);

    setLoading(false);
  };

  const availableForPayout = Math.max(0, balance - pendingPayout);

  const handleSubmit = async () => {
    if (!profile) return;
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amt || amt <= 0) {
      toast({ title: 'Zadaj sumu', variant: 'destructive' });
      return;
    }
    if (amt > availableForPayout) {
      toast({ title: 'Príliš veľká suma', description: `Dostupné: ${availableForPayout.toFixed(2)} €`, variant: 'destructive' });
      return;
    }
    if (!iban.trim() || iban.replace(/\s/g, '').length < 15) {
      toast({ title: 'Zadaj platný IBAN', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('payout_requests').insert({
      driver_id: profile.id,
      amount: amt,
      bank_iban: iban.replace(/\s/g, '').toUpperCase(),
      note: note || null,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Reserve pending payout
    if (walletId) {
      await supabase
        .from('wallets')
        .update({ pending_payout_amount: pendingPayout + amt })
        .eq('id', walletId);
    }

    toast({ title: 'Žiadosť odoslaná', description: 'Admin ti pošle peniaze na účet.' });
    setOpen(false);
    setAmount(''); setNote('');
    setSubmitting(false);
    load();
  };

  const statusBadge = (s: string) => {
    if (s === 'pending') return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Čaká</Badge>;
    if (s === 'paid') return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Vyplatené</Badge>;
    if (s === 'rejected') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Zamietnuté</Badge>;
    return <Badge>{s}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <SEO title="Peňaženka" description="Tvoja peňaženka a výplaty" path="/wallet" noindex />
      <Navigation />

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Späť
        </Button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-0 shadow-card bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2 opacity-90">
                <WalletIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Zostatok</span>
              </div>
              <div className="text-4xl font-bold tracking-tight">{balance.toFixed(2)} €</div>
              {pendingPayout > 0 && (
                <div className="text-sm opacity-80 mt-2">Rezervované na výplatu: {pendingPayout.toFixed(2)} €</div>
              )}
              <div className="text-sm opacity-90 mt-1">Dostupné: <strong>{availableForPayout.toFixed(2)} €</strong></div>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="mt-4 w-full sm:w-auto gap-2" disabled={availableForPayout <= 0}>
                    <Send className="w-4 h-4" />Požiadať o výplatu
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Žiadosť o výplatu</DialogTitle>
                    <DialogDescription>
                      Admin spracuje žiadosť a pošle peniaze na tvoj bankový účet (zvyčajne do 3 pracovných dní).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Suma (€)</Label>
                      <Input
                        type="number" step="0.01" min="1" max={availableForPayout}
                        value={amount} onChange={(e) => setAmount(e.target.value)}
                        placeholder={`Max ${availableForPayout.toFixed(2)}`}
                      />
                    </div>
                    <div>
                      <Label>IBAN</Label>
                      <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="SK00 0000 0000 0000 0000 0000" />
                    </div>
                    <div>
                      <Label>Poznámka (voliteľné)</Label>
                      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Zrušiť</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? 'Odosielam...' : 'Odoslať'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="mb-6 border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Žiadosti o výplatu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatiaľ žiadne žiadosti.</p>
            ) : payouts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-semibold">{Number(p.amount).toFixed(2)} €</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString('sk-SK')}
                  </div>
                  {p.admin_note && <div className="text-xs mt-1">Admin: {p.admin_note}</div>}
                </div>
                {statusBadge(p.status)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Posledné transakcie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Načítavam...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatiaľ žiadne transakcie.</p>
            ) : transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.description || t.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString('sk-SK')}
                    {t.fee ? ` · komisia ${Number(t.fee).toFixed(2)} €` : ''}
                  </div>
                </div>
                <div className={`font-semibold flex items-center gap-1 ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount).toFixed(2)}
                  <Euro className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
