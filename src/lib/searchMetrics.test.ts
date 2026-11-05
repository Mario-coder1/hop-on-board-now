import { describe, it, expect } from 'vitest';
import { shouldRecordSearch } from './searchMetrics';

describe('search metrics', () => {
  it('does not record without analytics consent', () => {
    expect(shouldRecordSearch(false, true, true, null, 'route')).toBe(false);
  });
  it('does not count failed or loading results as empty searches', () => {
    expect(shouldRecordSearch(true, false, true, null, 'route')).toBe(false);
  });
  it('does not count opening an unfiltered listing', () => {
    expect(shouldRecordSearch(true, true, false, null, 'route')).toBe(false);
  });
  it('deduplicates identical criteria despite result updates', () => {
    expect(shouldRecordSearch(true, true, true, 'route', 'route')).toBe(false);
    expect(shouldRecordSearch(true, true, true, 'route', 'new-route')).toBe(true);
  });
});