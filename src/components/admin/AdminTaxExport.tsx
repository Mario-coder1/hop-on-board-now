import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { VAT_RATE, formatEurCents, formatEurCentsLabel, splitVat, sumCents, toCents } from '@/lib/money';

interface Row {
  id: string;
  created: string;
  amount: number;
  refunded: number;
  net: number;
  amount_cents?: number | null;
  refunded_cents?: number | null;
  net_cents?: number | null;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  description: string | null;
  payment_intent: string | null;
  receipt_url: string | null;
}

interface CentRow {
  id: string;
  created: string;
  amountCents: number;
  refundedCents: number;
  netCents: number;
  vatCents: number;
  baseCents: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  description: string | null;
  payment_intent: string | null;
  receipt_url: string | null;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Prefer the exact integer cents Stripe sent; fall back to rounding the euro value. */
const centsOf = (exact: number | null | undefined, euros: number) =>
  typeof exact === 'number' && Number.isFinite(exact) ? Math.round(exact) : toCents(euros);

const AdminTaxExport = () => {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('payments-admin', {
      body: { action: 'tax_export', month, environment: 'live' },
    });
    setLoading(false);
    const msg = error?.message || (data as any)?.error;
    if (msg) {
      toast({ title: 'Chyba', description: msg, variant: 'destructive' });
      return;
    }
    setRows(((data as any)?.rows as Row[]) || []);
  };

  // Every figure below is computed in integer cents, so the sums and the VAT
  // split are exact to the cent and always add up.
  const all: CentRow[] = (rows || []).map((r) => {
    const netCents = centsOf(r.net_cents, r.net);
    const { vatCents, baseCents } = splitVat(netCents, VAT_RATE);
    return {
      id: r.id,
      created: r.created,
      amountCents: centsOf(r.amount_cents, r.amount),
      refundedCents: centsOf(r.refunded_cents, r.refunded),
      netCents,
      vatCents,
      baseCents,
      currency: r.currency,
      customer_name: r.customer_name,
      customer_email: r.customer_email,
      description: r.description,
      payment_intent: r.payment_intent,
      receipt_url: r.receipt_url,
    };
  });

  const active = all.filter((r) => r.netCents > 0);
  const refunded = all.filter((r) => r.refundedCents > 0);
  const grossCents = sumCents(all.map((r) => r.amountCents));
  // Celá online platba je rezervačný poplatok TakeMe (jazdu platí cestujúci vodičovi v hotovosti).
  const commissionCents = sumCents(all.map((r) => r.netCents));
  const commissionVatCents = sumCents(all.map((r) => r.vatCents));
  const commissionNetCents = sumCents(all.map((r) => r.baseCents));

  const eur = (cents: number) => formatEurCentsLabel(cents);

  const downloadCsv = () => {
    if (!rows?.length) return;
    const header = [
      'stripe_platba', 'datum_platby', 'zakaznik', 'email', 'popis',
      'zaplatene_brutto', 'refundovane', 'poplatok_brutto', 'dph_23', 'zaklad_dane', 'mena', 'payment_intent', 'doklad_url',
    ];
    const lines = all.map((r) =>
      [
        r.id, r.created.slice(0, 10), r.customer_name || '', r.customer_email || '', r.description || '',
        formatEurCents(r.amountCents), formatEurCents(r.refundedCents), formatEurCents(r.netCents),
        formatEurCents(r.vatCents), formatEurCents(r.baseCents),
        (r.currency || 'eur').toUpperCase(), r.payment_intent || '', r.receipt_url || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    );
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
            Celá online platba je rezervačný poplatok TakeMe za sprostredkovanie. Cenu úseku platí cestujúci vodičovi zvlášť v hotovosti; TakeMe vodičovi nič nevypláca.
            Údaje sa načítajú priamo zo Stripe, takže sú úplné aj po zmazaní starých jázd. Držané (nestrhnuté) platby sa nepočítajú.
            Sumy sú presné na cent: DPH sa počíta z každej platby osobitne a základ dane je zvyšok, takže súčet sedí do centa.
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
              { label: 'Platby (bez plných refundov)', value: String(active.length) },
              { label: 'Online poplatky (brutto)', value: eur(grossCents) },
              { label: 'Rezervačné poplatky (brutto)', value: eur(commissionCents) },
              { label: `DPH ${Math.round(VAT_RATE * 100)} % z poplatkov`, value: eur(commissionVatCents) },
              { label: 'Poplatky bez DPH (základ dane)', value: eur(commissionNetCents) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {refunded.length > 0 && (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                V mesiaci je {refunded.length} platieb s refundáciou — vrátená suma sa do poplatkov nepočíta.
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
