import { describe, expect, it } from 'vitest';
import { isRideOpenForBooking } from '../../supabase/functions/_shared/rideBooking';

// Dates are built relative to "now" so the checks test the rule, not the calendar.
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();

describe('booking without requiring LIVE', () => {
  it('allows an active ride shortly after its scheduled departure', () => {
    const ride = { status: 'active', available_seats: 3, departure_time: hoursFromNow(-2) };
    expect(isRideOpenForBooking(ride)).toBe(true);
  });
  it('closes an active ride more than 24 hours after departure', () => {
    const ride = { status: 'active', available_seats: 3, departure_time: hoursFromNow(-30) };
    expect(isRideOpenForBooking(ride)).toBe(false);
  });
  it('allows rides with no scheduled departure time', () => {
    expect(isRideOpenForBooking({ status: 'active', available_seats: 3 })).toBe(true);
  });
  it('allows LIVE rides', () => expect(isRideOpenForBooking({ status: 'in_progress', available_seats: 1 })).toBe(true));
  it('rejects completed rides', () => expect(isRideOpenForBooking({ status: 'completed', available_seats: 3 })).toBe(false));
  it('rejects cancelled rides', () => expect(isRideOpenForBooking({ status: 'cancelled', available_seats: 3 })).toBe(false));
  it('rejects full rides', () => expect(isRideOpenForBooking({ status: 'active', available_seats: 0 })).toBe(false));
});
