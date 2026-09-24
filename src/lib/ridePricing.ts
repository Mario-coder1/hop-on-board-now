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

/**
 * Rezervačný poplatok TakeMe podľa dĺžky úseku cestujúceho (VOP čl. 2).
 * Cenu za jazdu platí cestujúci vodičovi v hotovosti v aute.
 */
export const BOOKING_FEE_TIERS: { maxKm: number; fee: number }[] = [
  { maxKm: 20, fee: 2 },
  { maxKm: 50, fee: 3 },
  { maxKm: 100, fee: 4 },
  { maxKm: Infinity, fee: 5 },
];

export function bookingFeeForKm(km: number): number {
  const d = Number.isFinite(km) && km > 0 ? km : 0;
  return (BOOKING_FEE_TIERS.find((t) => d <= t.maxKm) ?? BOOKING_FEE_TIERS[BOOKING_FEE_TIERS.length - 1]).fee;
}

export interface PriceBreakdown {
  /** Suma, ktorú cestujúci zaplatí vodičovi v hotovosti (EUR). */
  cashToDriver: number;
  /** Alias pre cashToDriver (kompatibilita). */
  basePrice: number;
  /** Rezervačný poplatok TakeMe hradený online (EUR). */
  bookingFee: number;
  /** Suma účtovaná online = rezervačný poplatok (EUR). */
  amount: number;
  /** Total ride distance in km. */
  totalKm: number;
  /** Passenger segment distance in km. */
  segmentKm: number;
  /** Ratio segment/total (0..1). */
  ratio: number;
  /** True if proportional pricing was applied (dropoff provided). */
  proportional: boolean;
}

/**
 * Vypočíta hotovosť pre vodiča (proporčne podľa úseku) a rezervačný
 * poplatok TakeMe podľa km pásma. Online sa platí len poplatok.
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
  const rawCash = proportional ? pricePerSeat * ratio : pricePerSeat;
  const cashToDriver = Math.round(rawCash * 100) / 100;
  // Rezervačný poplatok = 15 % z ceny jazdy (úseku), minimálne 1 €.
  const bookingFee = Math.max(1, Math.round(cashToDriver * 0.15 * 100) / 100);

  return {
    cashToDriver,
    basePrice: cashToDriver,
    bookingFee,
    amount: bookingFee,
    totalKm,
    segmentKm,
    ratio,
    proportional,
  };
}

