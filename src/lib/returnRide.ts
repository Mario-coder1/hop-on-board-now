import type { Tables } from '@/integrations/supabase/types';

type SourceRide = Tables<'rides'>;
type SourceStop = Pick<Tables<'ride_stops'>, 'id' | 'address' | 'lat' | 'lng' | 'stop_order'>;

// Return routes must be recalculated: one-way roads can make reversing a polyline invalid.
export function makeReturnRideDraft(ride: SourceRide, stops: SourceStop[]) {
  return {
    origin: { address: ride.destination_address, lat: ride.destination_lat, lng: ride.destination_lng },
    destination: { address: ride.origin_address, lat: ride.origin_lat, lng: ride.origin_lng },
    stops: [...stops].sort((a, b) => b.stop_order - a.stop_order).map(({ id, address, lat, lng }) => ({ id, address, lat, lng })),
    seats: ride.available_seats,
    price: ride.price_per_seat,
    maxDetourKm: ride.max_detour_km,
    luggageCapacity: ride.luggage_capacity ?? 2,
    universityId: ride.university_id ?? '',
    gasStationId: ride.gas_station_id ?? '',
    category: ride.category,
    preferences: {
      pets_allowed: ride.pets_allowed ?? false,
      smoking_allowed: ride.smoking_allowed ?? false,
      luggage_allowed: ride.luggage_allowed ?? true,
      music_allowed: ride.music_allowed ?? true,
      ac_allowed: ride.ac_allowed ?? true,
      food_allowed: ride.food_allowed ?? true,
    },
  };
}