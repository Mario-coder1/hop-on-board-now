import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, XCircle, Send, RotateCcw } from 'lucide-react';
import { getStripeEnvironment } from '@/lib/stripe';

interface PayoutRow {
  id: string;
  driver_id: string;
  amount: number;
  status: string;
  bank_iban: string | null;
  note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  driver?: { full_name: string; phone: string | null } | null;
}

interface PaidRequestRow {
  id: string;
  amount_paid: number;
  payment_status: string;
  paid_at: string | null;
  payout_released_at: string | null;
  passenger: { full_name: string } | null;
  ride: { origin_address: string; destination_address: string; driver: { full_name: string } | null } | null;
}

const AdminPayoutsTab = () => {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payments, setPayments] = useState<PaidRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const [actionDialog, setActionDialog] = useState<{ payout: PayoutRow; action: 'paid' | 'rejected' } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: po }, { data: pay }] = await Promise.all([
      supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('ride_requests')
        .select('id, amount_paid, payment_status, paid_at, payout_released_at, passenger:profiles!ride_requests_passenger_id_fkey(full_name), ride:rides!ride_requests_ride_id_fkey(origin_address, destination_address, driver:profiles!rides_driver_id_fkey(full_name))')
        .eq('payment_status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(50),
    ]);

    let payoutRows = (po as any[]) || [];
    if (payoutRows.length) {
      const driverIds = Array.from(new Set(payoutRows.map(p => p.driver_id)));
      const { data: drivers } = await supabase
        .from('profiles').select('id, full_name, phone').in('id', driverIds);
      const map = new Map((drivers || []).map(d => [d.id, d]));
      payoutRows = payoutRows.map(p => ({ ...p, driver: map.get(p.driver_id) || null }));
    }

    setPayouts(payoutRows as PayoutRow[]);
    setPayments((pay as unknown as PaidRequestRow[]) || []);
    setLoading(false);
  };

  const handleProcess = async () => {
    if (!actionDialog) return;
    const { payout, action } = actionDialog;
    setProcessing(payout.id);

    const { data: { user } } = await supabase.auth.getUser();
    const updates: any = {
      status: action,
      admin_note: adminNote || null,
      processed_at: new Date().toISOString(),
      processed_by: user?.id,
    };
    const { error } = await supabase.from('payout_requests').update(updates).eq('id', payout.id);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      setProcessing(null);
      return;
    }

    // Wallet adjustments are handled automatically by DB trigger
    toast({ title: action === 'paid' ? 'Vyplatené' : 'Zamietnuté' });
    setActionDialog(null);
    setAdminNote('');
    setProcessing(null);
    load();
  };

  const handleRefund = async (requestId: string) => {
    if (!confirm('Naozaj vrátiť platbu pasažierovi?')) return;
    setProcessing(requestId);
    const { data, error } = await supabase.functions.invoke('refund-ride-payment', {
      body: { request_id: requestId, environment: getStripeEnvironment() },
    });
    if (error || (data as any)?.error) {
      toast({ title: 'Chyba refundu', description: error?.message || (data as any)?.error, variant: 'destructive' });
    } else {
      toast({ title: 'Refund úspešný' });
      load();
    }
    setProcessing(null);
  };

  const statusBadge = (s: string) => {
    if (s === 'pending') return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Čaká</Badge>;
    if (s === 'paid') return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Vyplatené</Badge>;
    if (s === 'rejected') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Zamietnuté</Badge>;
    return <Badge>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Žiadosti o výplatu vodičov</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Načítavam...</p>
            : payouts.length === 0 ? <p className="text-sm text-muted-foreground">Žiadne žiadosti.</p>
            : payouts.map(p => (
              <div key={p.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.driver?.full_name || 'Vodič'} — {Number(p.amount).toFixed(2)} €</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString('sk-SK')}
                      {p.driver?.phone && ` · ${p.driver.phone}`}
                    </div>
                    {p.bank_iban && <div className="text-xs font-mono mt-1">IBAN: {p.bank_iban}</div>}
                    {p.note && <div className="text-xs mt-1">Poznámka: {p.note}</div>}
                    {p.admin_note && <div className="text-xs mt-1 text-muted-foreground">Admin: {p.admin_note}</div>}
                  </div>
                  {statusBadge(p.status)}
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="gap-1"
                      onClick={() => { setActionDialog({ payout: p, action: 'paid' }); setAdminNote(''); }}>
                      <Send className="w-3.5 h-3.5" />Označiť ako vyplatené
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1"
                      onClick={() => { setActionDialog({ payout: p, action: 'rejected' }); setAdminNote(''); }}>
                      <XCircle className="w-3.5 h-3.5" />Zamietnuť
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posledné zaplatené jazdy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 ? <p className="text-sm text-muted-foreground">Žiadne platby.</p>
            : payments.map(r => (
              <div key={r.id} className="p-3 rounded-lg border flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.passenger?.full_name || '—'} → {r.ride?.driver?.full_name || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.ride?.origin_address} → {r.ride?.destination_address}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.paid_at && new Date(r.paid_at).toLocaleString('sk-SK')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold">{Number(r.amount_paid).toFixed(2)} €</div>
                  {r.payout_released_at ? (
                    <Badge variant="secondary">Vyplatené vodičovi</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1"
                      disabled={processing === r.id}
                      onClick={() => handleRefund(r.id)}>
                      <RotateCcw className="w-3.5 h-3.5" />Refund
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'paid' ? 'Označiť ako vyplatené' : 'Zamietnuť žiadosť'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'paid'
                ? 'Potvrď, že si odoslal peniaze na IBAN vodiča. Suma sa odpíše zo zostatku.'
                : 'Suma sa vráti späť do dostupného zostatku vodiča.'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Poznámka pre vodiča</Label>
            <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Zrušiť</Button>
            <Button onClick={handleProcess} disabled={!!processing}>
              {processing ? 'Spracovávam...' : 'Potvrdiť'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoutsTab;
