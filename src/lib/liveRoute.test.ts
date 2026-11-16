import { describe, expect, it } from 'vitest';
import { liveRouteUpdate, liveRouteWaypoints } from './liveRoute';

describe('live driving path', () => {
  it('changes only the live path, preserving agreed fare geometry and destinations', () => {
    expect(liveRouteUpdate([[17, 48], [18, 49]])).toEqual({ live_route_polyline: '[[17,48],[18,49]]' });
  });
  it('retains passenger pickup, dropoff and original stop in travel order', () => {
    const pickup = { lng: 18, lat: 48 }, dropoff = { lng: 20, lat: 48 }, stop = { lng: 19, lat: 48 };
    expect(liveRouteWaypoints([dropoff, pickup, stop, pickup], [[17, 48], [18, 48], [19, 48], [20, 48]])).toEqual([pickup, stop, dropoff]);
  });
  it('rejects invalid geometry', () => {
    expect(() => liveRouteUpdate([[17, 48], [NaN, 49]])).toThrow();
  });
});