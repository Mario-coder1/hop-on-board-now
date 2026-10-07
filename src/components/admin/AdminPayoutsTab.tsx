import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';
import { getStripeEnvironment, isPaymentsEnabled } from '@/lib/stripe';

interface PaidRequestRow {
  id: string;
  amount_paid: number;
  payment_status: string;
  paid_at: string | null;
  payment_captured_at: string | null;
  passenger: { full_name: string } | null;
  ride: { origin_address: string; destination_address: string; driver: { full_name: string } | null } | null;
}

const AdminPayoutsTab = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaidRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: pay, error } = await supabase
      .from('ride_requests')
      .select('id, amount_paid, payment_status, paid_at, payment_captured_at, passenger:profiles!ride_requests_passenger_id_fkey(full_name), ride:rides!ride_requests_ride_id_fkey(origin_address, destination_address, driver:profiles!rides_driver_id_fkey(full_name))')
      .eq('payment_status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(50);
    if (error) toast({ title: 'Chyba načítania platieb', description: error.message, variant: 'destructive' });

    setPayments((pay as unknown as PaidRequestRow[]) || []);
    setLoading(false);
  };

  const handleRefund = async (requestId: string) => {
    if (!isPaymentsEnabled()) {
      toast({ title: 'Platby sú vypnuté', description: 'Refundácie nie sú dostupné, pretože platobná brána nie je zapnutá.' });
      return;
    }
    if (!confirm('Naozaj vrátiť rezervačný poplatok alebo uvoľniť blokáciu cestujúcemu?')) return;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rezervačné poplatky TakeMe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Online poplatok patrí výhradne TakeMe. Cenu úseku platí cestujúci vodičovi zvlášť v hotovosti.</p>
          {loading ? <p className="text-sm text-muted-foreground">Načítavam...</p> : payments.length === 0 ? <p className="text-sm text-muted-foreground">Žiadne platby.</p>
            : payments.map(r => (
              <div key={r.id} className="p-3 rounded-lg border flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.passenger?.full_name || '—'} · Vodič: {r.ride?.driver?.full_name || '—'}
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
                  <Badge variant="secondary">{r.payment_captured_at ? 'Poplatok strhnutý' : 'Blokácia na karte'}</Badge>
                  <Button size="sm" variant="outline" className="gap-1"
                    disabled={processing === r.id}
                    onClick={() => handleRefund(r.id)}>
                    <RotateCcw className="w-3.5 h-3.5" />{r.payment_captured_at ? 'Vrátiť poplatok' : 'Uvoľniť blokáciu'}
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

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
