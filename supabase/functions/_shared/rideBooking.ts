// Base check; driver activity after departure is verified by the is_ride_joinable RPC.
export function isRideOpenForBooking(ride: { status: string | null; available_seats: number; departure_time?: string | null }): boolean {
  if (!((ride.status === 'active' || ride.status === 'in_progress') && ride.available_seats > 0)) return false;
  if (!ride.departure_time) return true;
  return (Date.now() - new Date(ride.departure_time).getTime()) / 3600000 <= 12;
}
