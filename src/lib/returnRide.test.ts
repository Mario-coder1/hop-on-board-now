import { describe, expect, it } from 'vitest';
import type { Tables } from '@/integrations/supabase/types';
import { makeReturnRideDraft } from './returnRide';

const ride = {
  id: 'outbound', driver_id: 'driver',
  origin_address: 'Bratislava', origin_lat: 48.15, origin_lng: 17.11,
  destination_address: 'Letisko Ostrava', destination_lat: 49.70, destination_lng: 18.11,
  category: 'airport', available_seats: 3, price_per_seat: 25,
  max_detour_km: 15, luggage_capacity: 4, university_id: 'community',
  gas_station_id: null, pets_allowed: true, smoking_allowed: false,
  luggage_allowed: true, music_allowed: false, ac_allowed: true, food_allowed: false,
} as Tables<'rides'>;

describe('return ride draft', () => {
  it('swaps both addresses and coordinates', () => {
    const draft = makeReturnRideDraft(ride, []);
    expect(draft.origin).toEqual({ address: 'Letisko Ostrava', lat: 49.70, lng: 18.11 });
    expect(draft.destination).toEqual({ address: 'Bratislava', lat: 48.15, lng: 17.11 });
  });
  it('reverses persisted stop order without changing the outbound stops', () => {
    const stops = [
      { id: 'a', address: 'Trnava', lat: 48.37, lng: 17.58, stop_order: 1 },
      { id: 'b', address: 'Žilina', lat: 49.22, lng: 18.74, stop_order: 2 },
    ];
    expect(makeReturnRideDraft(ride, stops).stops.map(s => s.address)).toEqual(['Žilina', 'Trnava']);
    expect(stops[0].address).toBe('Trnava');
  });
  it('preserves category, price, seats, luggage and community restrictions', () => {
    expect(makeReturnRideDraft(ride, [])).toMatchObject({
      category: 'airport', seats: 3, price: 25, maxDetourKm: 15,
      luggageCapacity: 4, universityId: 'community', preferences: { pets_allowed: true, music_allowed: false },
    });
  });
  it('does not carry outbound time, status, polyline or passenger bookings into the new ride', () => {
    const draft = makeReturnRideDraft(ride, []);
    expect(draft).not.toHaveProperty('departure_time');
    expect(draft).not.toHaveProperty('route_polyline');
    expect(draft).not.toHaveProperty('status');
    expect(draft).not.toHaveProperty('ride_requests');
  });
});