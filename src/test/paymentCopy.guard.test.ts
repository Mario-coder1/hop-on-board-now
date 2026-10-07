import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.resolve(__dirname, '../../', file), 'utf8');

describe('Public payment copy matches the platform reservation fee model', () => {
  it('explains platform fees and separate cash fares in all four FAQ translations', () => {
    const source = read('src/contexts/LanguageContext.tsx');
    const answers = Array.from(source.matchAll(/"faq\.a4": "([^"]+)"/g), match => match[1]);
    expect(answers).toHaveLength(4);
    for (const answer of answers) {
      expect(answer).toContain('TakeMe');
      expect(answer).toMatch(/15\s?%/);
      expect(answer).toMatch(/hotovosti|cash|gotówką/);
      expect(answer).not.toMatch(/uvoľnia vodičovi|uvolní řidiči|released to the driver|uwalniane kierowcy/i);
    }
  });

  it('admin payment screen tracks card capture, not driver payouts', () => {
    const source = read('src/components/admin/AdminPayoutsTab.tsx');
    expect(source).toContain('Rezervačné poplatky TakeMe');
    expect(source).toContain('payment_captured_at');
    expect(source).not.toContain('payout_requests');
    expect(source).not.toContain('Vyplatené vodičovi');
    expect(source).not.toContain('Žiadosti o výplatu vodičov');
  });

  it('tax export does not represent cash fares as online driver payouts', () => {
    const source = read('src/components/admin/AdminTaxExport.tsx');
    expect(source).not.toContain('driver_payout_amount');
    expect(source).not.toContain('podiel_vodica');
    expect(source).toContain('hotovosti');
  });
});