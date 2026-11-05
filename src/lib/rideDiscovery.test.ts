import { describe, expect, it } from 'vitest';
import { DISCOVERABLE_RIDE_STATUSES } from './rideDiscovery';

describe('ride discovery', () => {
  it('keeps an active ride discoverable after its scheduled departure without LIVE', () => {
    const ride = { status: 'active' as const, departure_time: '2026-11-05T08:05:00Z' };
    const now = new Date('2026-11-05T08:49:00Z');
    const visible = [ride].filter(r => DISCOVERABLE_RIDE_STATUSES.includes(r.status));
    expect(new Date(ride.departure_time).getTime()).toBeLessThan(now.getTime());
    expect(visible).toEqual([ride]);
  });
  it('keeps LIVE rides discoverable', () => {
    expect(DISCOVERABLE_RIDE_STATUSES.includes('in_progress')).toBe(true);
  });
  it('does not show completed rides', () => {
    expect(DISCOVERABLE_RIDE_STATUSES.includes('completed')).toBe(false);
  });
  it('does not show cancelled rides', () => {
    expect(DISCOVERABLE_RIDE_STATUSES.includes('cancelled')).toBe(false);
  });
});