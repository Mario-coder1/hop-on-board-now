import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

const VAT_RATE = 0.23;

interface Row {
  id: string;
  amount_paid: number | null;
  commission_amount: number | null;
  driver_payout_amount: number | null;
  currency: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  stripe_payment_intent_id: string | null;
  passenger: { full_name: string } | null;
  ride: {
    origin_address: string;
    destination_address: string;
    departure_time: string;
    driver: { full_name: string } | null;
  } | null;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

const AdminTaxExport = () => {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  const range = (m: string) => {
    const start = new Date(`${m}-01T00:00:00Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  };

  const load = async () => {
    setLoading(true);
    const { from, to } = range(month);
    const { data, error } = await supabase
      .from('ride_requests')
      .select(
        'id, amount_paid, commission_amount, driver_payout_amount, currency, paid_at, refunded_at, stripe_payment_intent_id, passenger:profiles!ride_requests_passenger_id_fkey(full_name), ride:rides!ride_requests_ride_id_fkey(origin_address, destination_address, departure_time, driver:profiles!rides_driver_id_fkey(full_name))'
      )
      .not('paid_at', 'is', null)
      .gte('paid_at', from)
      .lt('paid_at', to)
      .order('paid_at', { ascending: true });

    setLoading(false);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data as unknown as Row[]) || []);
  };

  const active = (rows || []).filter((r) => !r.refunded_at);
  const refunded = (rows || []).filter((r) => r.refunded_at);

  const sum = (fn: (r: Row) => number) => active.reduce((a, r) => a + fn(r), 0);
  const gross = sum((r) => Number(r.amount_paid || 0));
  const commission = sum((r) => Number(r.commission_amount || 0));
  const driverShare = sum((r) => Number(r.driver_payout_amount || 0));
  const commissionVat = commission - commission / (1 + VAT_RATE);
  const commissionNet = commission - commissionVat;

  const eur = (n: number) => `${n.toFixed(2)} €`;

  const downloadCsv = () => {
    if (!rows?.length) return;
    const header = [
      'id_rezervacie',
      'datum_platby',
      'datum_jazdy',
      'vodic',
      'spolujazdec',
      'odkial',
      'kam',
      'suma_brutto',
      'provizia_brutto',
      'provizia_dph_23',
      'provizia_netto',
      'podiel_vodica',
      'mena',
      'stripe_payment_intent',
      'refundovane',
    ];
    const lines = rows.map((r) => {
      const c = Number(r.commission_amount || 0);
      const vat = c - c / (1 + VAT_RATE);
      return [
        r.id,
        r.paid_at ? new Date(r.paid_at).toISOString().slice(0, 10) : '',
        r.ride?.departure_time ? new Date(r.ride.departure_time).toISOString().slice(0, 10) : '',
        r.ride?.driver?.full_name || '',
        r.passenger?.full_name || '',
        r.ride?.origin_address || '',
        r.ride?.destination_address || '',
        Number(r.amount_paid || 0).toFixed(2),
        c.toFixed(2),
        vat.toFixed(2),
        (c - vat).toFixed(2),
        Number(r.driver_payout_amount || 0).toFixed(2),
        (r.currency || 'EUR').toUpperCase(),
        r.stripe_payment_intent_id || '',
        r.refunded_at ? 'ano' : 'nie',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';');
    });
    const csv = '\uFEFF' + [header.join(';'), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `takeme-provizie-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Mesačný daňový export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Zdaňujeme len províziu TakeMe za sprostredkovanie. Podiel vodiča je jeho príjem a vodič si dane rieši sám.
            Export slúži účtovníkovi ako podklad k DPH z provízií.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="tax-month">Mesiac</Label>
              <Input
                id="tax-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Načítať
            </Button>
            <Button variant="outline" onClick={downloadCsv} disabled={!rows?.length}>
              <Download className="w-4 h-4 mr-2" />
              Stiahnuť CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Platby (bez refundov)', value: String(active.length) },
              { label: 'Objem jázd (brutto)', value: eur(gross) },
              { label: 'Podiel vodičov', value: eur(driverShare) },
              { label: 'Provízia TakeMe (brutto)', value: eur(commission) },
              { label: `DPH ${Math.round(VAT_RATE * 100)} % z provízie`, value: eur(commissionVat) },
              { label: 'Provízia bez DPH (základ dane)', value: eur(commissionNet) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-semibold mt-1">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {refunded.length > 0 && (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                V mesiaci je {refunded.length} refundovaných platieb — v CSV sú označené, do súčtov sa nepočítajú.
              </CardContent>
            </Card>
          )}

          {rows.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Za vybraný mesiac neboli nájdené žiadne platby.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AdminTaxExport;
