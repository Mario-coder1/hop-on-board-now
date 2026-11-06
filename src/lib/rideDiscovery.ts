// Departure time alone does not end a ride right away, but rides that surely ended are closed:
// a ride never started (active) closes 3 h after departure; a LIVE ride (in_progress) 12 h after.
export const DISCOVERABLE_RIDE_STATUSES: ('active' | 'in_progress' | 'completed' | 'cancelled')[] = ['active', 'in_progress'];
export const ACTIVE_GRACE_HOURS = 3;
export const LIVE_GRACE_HOURS = 12;

export function isRideJoinable(ride: { status: string | null; departure_time: string }, now = new Date()): boolean {
  const dep = new Date(ride.departure_time).getTime();
  const age = (now.getTime() - dep) / 3600000;
  if (ride.status === 'active') return age <= ACTIVE_GRACE_HOURS;
  if (ride.status === 'in_progress') return age <= LIVE_GRACE_HOURS;
  return false;
}

/** PostgREST .or() filter that hides rides which surely ended. */
export function joinableRidesFilter(now = new Date()): string {
  const a = new Date(now.getTime() - ACTIVE_GRACE_HOURS * 3600000).toISOString();
  const l = new Date(now.getTime() - LIVE_GRACE_HOURS * 3600000).toISOString();
  return `and(status.eq.active,departure_time.gte.${a}),and(status.eq.in_progress,departure_time.gte.${l})`;
}
