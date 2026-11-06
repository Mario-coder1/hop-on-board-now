// After departure (+15 min) a ride is joinable only while the driver is active in the app or moving; hard cap 12 h.
export const DISCOVERABLE_RIDE_STATUSES: ('active' | 'in_progress' | 'completed' | 'cancelled')[] = ['active', 'in_progress'];
export const LIVE_GRACE_HOURS = 12;

export function isRideJoinable(ride: { status: string | null; departure_time: string }, now = new Date()): boolean {
  const dep = new Date(ride.departure_time).getTime();
  const age = (now.getTime() - dep) / 3600000;
  if (ride.status === 'active' || ride.status === 'in_progress') return age <= LIVE_GRACE_HOURS;
  return false;
}

/** PostgREST .or() filter that hides rides which surely ended. */
export function joinableRidesFilter(now = new Date()): string {
  const l = new Date(now.getTime() - LIVE_GRACE_HOURS * 3600000).toISOString();
  return `and(status.in.(active,in_progress),departure_time.gte.${l})`;
}

/**
 * After departure a ride stays joinable only while the driver is active in the app or moving
 * (checked on the server). Up to 15 min after departure it is always joinable.
 */
export async function filterJoinableRides<T extends { id: string; departure_time: string }>(rides: T[]): Promise<T[]> {
  const cutoff = Date.now() - 15 * 60000;
  const late = rides.filter((r) => new Date(r.departure_time).getTime() < cutoff);
  if (late.length === 0) return rides;
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.rpc('filter_joinable_rides', { _ids: late.map((r) => r.id) });
  const ok = new Set((data as string[] | null) ?? []);
  return rides.filter((r) => new Date(r.departure_time).getTime() >= cutoff || ok.has(r.id));
}
