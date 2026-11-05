export function isRideOpenForBooking(ride: { status: string | null; available_seats: number }): boolean {
  return (ride.status === 'active' || ride.status === 'in_progress') && ride.available_seats > 0;
}