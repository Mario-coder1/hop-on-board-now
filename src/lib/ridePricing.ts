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
  /** Base price kept by the driver (proportional to segment, EUR). */
  basePrice: number;
  /** Platform commission added on top (EUR). */
  commission: number;
  /** Stripe processing fee added on top (EUR). */
  stripeFee: number;
  /** Final amount the passenger pays = basePrice + commission + stripeFee (EUR). */
  amount: number;
  /** Total ride distance in km. */
  totalKm: number;
  /** Passenger segment distance in km. */
  segmentKm: number;
  /** Ratio segment/total (0..1). */
  ratio: number;
  /** True if proportional pricing was applied (dropoff provided). */
  proportional: boolean;
  /** Platform commission percent used (e.g. 10). */
  commissionPercent: number;
  /** Stripe fee percent used (e.g. 1.5). */
  stripeFeePercent: number;
  /** Stripe fixed fee in cents (e.g. 25 = 0.25 €). */
  stripeFeeFixedCents: number;
}

/**
 * Compute proportional price + platform commission + Stripe fee added ON TOP.
 * Driver receives basePrice; platform keeps commission; Stripe takes its fee.
 * Passenger pays everything. Stripe min 0.50 €.
 */
export function computeRidePrice(args: {
  pricePerSeat: number;
  origin: LngLat;
  destination: LngLat;
  pickup: LngLat;
  dropoff?: LngLat | null;
  routePolyline?: string | null;
  /** Platform commission percent (default 10). */
  commissionPercent?: number;
  /** Stripe variable fee percent (default 1.5). */
  stripeFeePercent?: number;
  /** Stripe fixed fee in cents (default 25 = 0.25 €). */
  stripeFeeFixedCents?: number;
}): PriceBreakdown {
  const { pricePerSeat, origin, destination, pickup, dropoff, routePolyline } = args;
  const commissionPercent = args.commissionPercent ?? 10;
  const stripeFeePercent = args.stripeFeePercent ?? 1.5;
  const stripeFeeFixedCents = args.stripeFeeFixedCents ?? 25;
  const route = parseRoute(routePolyline);

  const totalM = route ? totalRouteM(route) : haversineM(origin, destination);
  const totalKm = totalM / 1000;

  let segmentM: number;
  let proportional: boolean;
  if (!dropoff) {
    segmentM = totalM;
    proportional = false;
  } else if (route) {
    const i1 = closestIdx(pickup, route);
    const i2 = closestIdx(dropoff, route);
    const a = Math.min(i1, i2);
    const b = Math.max(i1, i2);
    segmentM = distAtIdx(route, b) - distAtIdx(route, a);
    proportional = true;
  } else {
    segmentM = haversineM(pickup, dropoff);
    proportional = true;
  }

  const segmentKm = segmentM / 1000;
  const ratio = totalM > 0 ? Math.min(1, Math.max(0, segmentM / totalM)) : 1;
  const rawBase = proportional ? pricePerSeat * ratio : pricePerSeat;
  const basePrice = Math.round(rawBase * 100) / 100;
  const commission = Math.round(basePrice * commissionPercent) / 100;
  const subtotal = basePrice + commission;
  const fixed = stripeFeeFixedCents / 100;
  // Passenger pays gross = (subtotal + fixed) / (1 - pct/100)
  // so after Stripe takes its cut, subtotal remains for driver + platform.
  const rawGross = (subtotal + fixed) / (1 - stripeFeePercent / 100);
  // Round UP to next cent so platform never loses money on rounding.
  let amount = Math.ceil(rawGross * 100) / 100;
  if (amount < 0.5) amount = 0.5;
  const stripeFee = Math.round((amount - subtotal) * 100) / 100;

  return {
    basePrice, commission, stripeFee, amount,
    totalKm, segmentKm, ratio, proportional,
    commissionPercent, stripeFeePercent, stripeFeeFixedCents,
  };
}
