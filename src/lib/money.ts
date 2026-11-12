// All money math in the app goes through integer cents, so totals and VAT
// splits are exact to the cent and never drift by a rounding residue.

export const VAT_RATE = 0.23;

/** Convert a euro amount (e.g. from the database) to integer cents. */
export const toCents = (eur: number): number => Math.round(Number(eur) * 100);

/** Format integer cents as a plain 2-decimal euro string, e.g. 1234 -> "12.34". */
export const formatEurCents = (cents: number): string => {
  const c = Math.round(Number(cents));
  const sign = c < 0 ? '-' : '';
  const abs = Math.abs(c);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};

/** Format integer cents with currency suffix, e.g. 1234 -> "12.34 €". */
export const formatEurCentsLabel = (cents: number, currency = 'eur'): string => {
  const code = (currency || 'eur').toUpperCase();
  return `${formatEurCents(cents)} ${code === 'EUR' ? '€' : code}`;
};

/**
 * Split a gross (VAT-inclusive) amount in cents into VAT cents and the tax
 * base cents. VAT is rounded half-up once, the base is whatever is left, so
 * `baseCents + vatCents === grossCents` always holds exactly.
 */
export const splitVat = (grossCents: number, rate: number = VAT_RATE) => {
  const gross = Math.round(Number(grossCents));
  const vatCents = Math.round((gross * rate) / (1 + rate));
  return { grossCents: gross, vatCents, baseCents: gross - vatCents };
};

/** Sum a list of cent values as integers (no float accumulation). */
export const sumCents = (values: number[]): number =>
  values.reduce((total, value) => total + Math.round(Number(value)), 0);
