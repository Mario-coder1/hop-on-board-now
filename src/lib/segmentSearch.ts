export type SearchStop = { address: string; lat: number; lng: number; stop_order: number };
export type SegmentSearchRide = {
  id: string; origin_address: string; destination_address: string;
  origin_lat: number; origin_lng: number; destination_lat: number; destination_lng: number;
  ride_stops?: SearchStop[];
};

export function searchSegment(ride: SegmentSearchRide, from: string, to: string) {
  const points = [
    { address: ride.origin_address, lat: ride.origin_lat, lng: ride.origin_lng },
    ...(ride.ride_stops ?? []).slice().sort((a, b) => a.stop_order - b.stop_order),
    { address: ride.destination_address, lat: ride.destination_lat, lng: ride.destination_lng },
  ];
  const match = (address: string, query: string) => address.toLocaleLowerCase().includes(query.split(',')[0].trim().toLocaleLowerCase());
  const start = from.trim() ? points.findIndex(p => match(p.address, from)) : 0;
  const end = to.trim() ? points.findIndex((p, i) => i > start && match(p.address, to)) : points.length - 1;
  if (start < 0 || end <= start) return null;
  return { pickup: points[start], dropoff: points[end] };
}