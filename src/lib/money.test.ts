import { describe, expect, it } from 'vitest';
import {
  VAT_RATE,
  formatEurCents,
  formatEurCentsLabel,
  splitVat,
  sumCents,
  toCents,
} from './money';

describe('money (integer cents)', () => {
  it('converts euros to exact integer cents', () => {
    expect(toCents(1)).toBe(100);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(3.0000000000000004)).toBe(300);
    expect(toCents(299.99)).toBe(29999);
  });

  it('formats cents to the cent without float drift', () => {
    expect(formatEurCents(0)).toBe('0.00');
    expect(formatEurCents(5)).toBe('0.05');
    expect(formatEurCents(100)).toBe('1.00');
    expect(formatEurCents(1234)).toBe('12.34');
    expect(formatEurCents(29999)).toBe('299.99');
    expect(formatEurCents(-299)).toBe('-2.99');
    expect(formatEurCentsLabel(100)).toBe('1.00 €');
    expect(formatEurCentsLabel(100, 'CZK')).toBe('1.00 CZK');
  });

  it('splits VAT so base + VAT equals the gross exactly', () => {
    expect(splitVat(100)).toEqual({ grossCents: 100, vatCents: 19, baseCents: 81 });
    expect(splitVat(300)).toEqual({ grossCents: 300, vatCents: 56, baseCents: 244 });
    expect(splitVat(1)).toEqual({ grossCents: 1, vatCents: 0, baseCents: 1 });
    expect(splitVat(299)).toEqual({ grossCents: 299, vatCents: 56, baseCents: 243 });
  });

  it('keeps every VAT split additive', () => {
    const rows = [100, 300, 1, 299, 1450, 9999, 7];
    for (const gross of rows) {
      const { vatCents, baseCents } = splitVat(gross);
      expect(vatCents + baseCents).toBe(gross);
    }
    const total = sumCents(rows);
    const vat = sumCents(rows.map((g) => splitVat(g).vatCents));
    const base = sumCents(rows.map((g) => splitVat(g).baseCents));
    expect(vat + base).toBe(total);
  });

  it('sums cent values without float residue', () => {
    expect(sumCents([10, 20, 5])).toBe(35);
    expect(sumCents([toCents(0.1 + 0.2), toCents(0.3)])).toBe(60);
    expect(sumCents([])).toBe(0);
  });

  it('uses the 23 % Slovak VAT rate', () => {
    expect(VAT_RATE).toBe(0.23);
  });
});
