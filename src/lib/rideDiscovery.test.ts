import { describe, expect, it } from 'vitest';
import { DISCOVERABLE_RIDE_STATUSES, isRideJoinable } from './rideDiscovery';

describe('ride discovery', () => {
  it('keeps an active ride joinable shortly after departure', () => {
    expect(isRideJoinable({ status: 'active', departure_time: '2026-11-05T08:05:00Z' }, new Date('2026-11-05T08:49:00Z'))).toBe(true);
  });
  it('closes an unstarted ride from yesterday', () => {
    expect(isRideJoinable({ status: 'active', departure_time: '2026-11-05T08:05:00Z' }, new Date('2026-11-06T07:40:00Z'))).toBe(false);
  });
  it('closes an unstarted ride 3 h after departure', () => {
    expect(isRideJoinable({ status: 'active', departure_time: '2026-11-05T08:00:00Z' }, new Date('2026-11-05T11:01:00Z'))).toBe(false);
  });
  it('keeps a LIVE ride joinable within 12 h, not after', () => {
    expect(isRideJoinable({ status: 'in_progress', departure_time: '2026-11-05T08:00:00Z' }, new Date('2026-11-05T19:00:00Z'))).toBe(true);
    expect(isRideJoinable({ status: 'in_progress', departure_time: '2026-11-05T08:00:00Z' }, new Date('2026-11-05T21:00:00Z'))).toBe(false);
  });
  it('does not show completed or cancelled rides', () => {
    expect(DISCOVERABLE_RIDE_STATUSES.includes('completed')).toBe(false);
    expect(DISCOVERABLE_RIDE_STATUSES.includes('cancelled')).toBe(false);
  });
});
