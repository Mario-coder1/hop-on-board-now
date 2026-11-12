import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');

// Money shown or exported for taxes must never drift by a rounding residue:
// every figure is computed in integer cents and VAT is split per payment.
describe('tax export and invoice money are exact to the cent', () => {
  const exportUi = read('src/components/admin/AdminTaxExport.tsx');
  const adminFn = read('supabase/functions/payments-admin/index.ts');
  const invoice = read('src/lib/invoice.ts');

  it('Stripe export returns integer cents', () => {
    expect(adminFn).toContain('net_cents');
    expect(adminFn).toContain('amount_cents');
    expect(adminFn).toContain('refunded_cents');
    expect(adminFn).toContain('Math.round(c.amount_captured ?? c.amount ?? 0)');
  });

  it('export screen computes totals and VAT from cents, not floats', () => {
    expect(exportUi).toContain("from '@/lib/money'");
    expect(exportUi).toContain('net_cents');
    expect(exportUi).toContain('splitVat(');
    expect(exportUi).toContain('sumCents(');
    expect(exportUi).toContain('formatEurCents(');
    // no float formatting of money left anywhere in the screen
    expect(exportUi).not.toContain('.toFixed(');
  });

  it('invoice document splits VAT in cents', () => {
    expect(invoice).toContain("from './money'");
    expect(invoice).toContain('splitVat(');
    expect(invoice).toContain('toCents(');
    expect(invoice).not.toContain('.toFixed(');
    expect(invoice).not.toContain('r2(');
  });
});
