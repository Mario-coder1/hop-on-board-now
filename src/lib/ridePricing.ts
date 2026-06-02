// Shared helper for proportional ride pricing based on actual segment length
// vs the driver's total route. Kept in sync with the edge function logic.

export type LngLat = [number, number];

const EARTH_M = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

export function parseRoute(raw: string | null | undefined): LngLat[] | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p) || p.length < 2) return null;
    if (!Array.isArray(p[0]) || p[0].length !== 2) return null;
    return p as LngLat[];
  } catch {
    return null;
  }
}

function closestIdx(point: LngLat, route: LngLat[]): number {
  let min = Infinity;
  let idx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = haversineM(point, route[i]);
    if (d < min) { min = d; idx = i; }
  }
  return idx;
}

/** Cumulative distance from start to vertex idx, in meters. */
function distAtIdx(route: LngLat[], idx: number): number {
  let sum = 0;
  for (let i = 1; i <= idx; i++) sum += haversineM(route[i - 1], route[i]);
  return sum;
}

/** Total polyline length in meters. */
export function totalRouteM(route: LngLat[]): number {
  return distAtIdx(route, route.length - 1);
}

export interface PriceBreakdown {
  /** Final amount the passenger pays (EUR, rounded to cents). */
  amount: number;
  /** Total ride distance in km. */
  totalKm: number;
  /** Passenger segment distance in km. */
  segmentKm: number;
  /** Ratio segment/total (0..1). */
  ratio: number;
  /** True if proportional pricing was applied (dropoff provided + route known). */
  proportional: boolean;
}

/**
 * Compute the proportional price the passenger should pay.
 * - If no dropoff coords → full price (rides default to going to final destination).
 * - If route polyline is available → use along-route distance.
 * - Otherwise fall back to straight-line haversine.
 * Minimum charge: 0.50 € (Stripe minimum).
 */
export function computeRidePrice(args: {
  pricePerSeat: number;
  origin: LngLat;
  destination: LngLat;
  pickup: LngLat;
  dropoff?: LngLat | null;
  routePolyline?: string | null;
}): PriceBreakdown {
  const { pricePerSeat, origin, destination, pickup, dropoff, routePolyline } = args;
  const route = parseRoute(routePolyline);

  // Total trip length
  const totalM = route ? totalRouteM(route) : haversineM(origin, destination);
  const totalKm = totalM / 1000;

  if (!dropoff) {
    return {
      amount: Math.max(0.5, Math.round(pricePerSeat * 100) / 100),
      totalKm,
      segmentKm: totalKm,
      ratio: 1,
      proportional: false,
    };
  }

  let segmentM: number;
  if (route) {
    const i1 = closestIdx(pickup, route);
    const i2 = closestIdx(dropoff, route);
    const a = Math.min(i1, i2);
    const b = Math.max(i1, i2);
    segmentM = distAtIdx(route, b) - distAtIdx(route, a);
  } else {
    segmentM = haversineM(pickup, dropoff);
  }

  const segmentKm = segmentM / 1000;
  const ratio = totalM > 0 ? Math.min(1, Math.max(0, segmentM / totalM)) : 1;
  const raw = pricePerSeat * ratio;
  // Round to nearest cent, enforce Stripe minimum of 0.50 €
  const amount = Math.max(0.5, Math.round(raw * 100) / 100);

  return { amount, totalKm, segmentKm, ratio, proportional: true };
}
