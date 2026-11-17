import { describe, it, expect } from 'vitest';
import { searchSegment } from './segmentSearch';
const ride = { id: 'ride', origin_address: 'Bratislava', destination_address: 'Košice', origin_lat: 48, origin_lng: 17, destination_lat: 48, destination_lng: 19,
  ride_stops: [{ address: 'Nitra', lat: 48, lng: 18, stop_order: 1 }] };
describe('seat segment search', () => {
  it('selects Nitra to Košice on a Bratislava to Košice ride', () => {
    expect(searchSegment(ride, 'Nitra', 'Košice')).toEqual({ pickup: { address: 'Nitra', lat: 48, lng: 18, stop_order: 1 }, dropoff: { address: 'Košice', lat: 48, lng: 19 } });
  });
  it('does not offer travel backwards', () => {
    expect(searchSegment(ride, 'Košice', 'Nitra')).toBeNull();
  });
  it('matches the city in a selected full autocomplete address', () => {
    expect(searchSegment(ride, 'Nitra, Nitriansky kraj, Slovensko', 'Košice, Slovensko')?.pickup.address).toBe('Nitra');
  });
  it('uses the ride destination for a one-sided search', () => {
    expect(searchSegment(ride, 'Nitra', '')?.dropoff.address).toBe('Košice');
  });
});