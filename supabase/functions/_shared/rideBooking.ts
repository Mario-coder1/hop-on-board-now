// Rides that surely ended are closed: unstarted (active) 3 h after departure, LIVE (in_progress) 12 h after.
export function isRideOpenForBooking(ride: { status: string | null; available_seats: number; departure_time?: string | null }): boolean {
  if (!((ride.status === 'active' || ride.status === 'in_progress') && ride.available_seats > 0)) return false;
  if (!ride.departure_time) return true;
  const ageH = (Date.now() - new Date(ride.departure_time).getTime()) / 3600000;
  return ride.status === 'active' ? ageH <= 3 : ageH <= 12;
}
