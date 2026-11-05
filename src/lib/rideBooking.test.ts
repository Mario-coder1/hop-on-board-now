import { describe, expect, it } from 'vitest';
import { isRideOpenForBooking } from '../../supabase/functions/_shared/rideBooking';

describe('booking without requiring LIVE', () => {
  it('allows an active ride even after scheduled departure', () => {
    const ride = { status: 'active', available_seats: 3, departure_time: '2026-11-05T08:05:00Z' };
    expect(isRideOpenForBooking(ride)).toBe(true);
  });
  it('allows LIVE rides', () => expect(isRideOpenForBooking({ status: 'in_progress', available_seats: 1 })).toBe(true));
  it('rejects completed rides', () => expect(isRideOpenForBooking({ status: 'completed', available_seats: 3 })).toBe(false));
  it('rejects cancelled rides', () => expect(isRideOpenForBooking({ status: 'cancelled', available_seats: 3 })).toBe(false));
  it('rejects full rides', () => expect(isRideOpenForBooking({ status: 'active', available_seats: 0 })).toBe(false));
});