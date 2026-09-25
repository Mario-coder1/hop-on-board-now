// Geo helpers for matching a passenger pickup point against a ride's planned route.

export type LngLat = [number, number]; // [lng, lat] — Mapbox/GeoJSON convention

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Haversine distance in meters between two [lng, lat] points. */
export const haversineM = (a: LngLat, b: LngLat): number => {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/** Parse the route_polyline column (we store JSON of GeoJSON [lng, lat][] coords). */
export const parseRoutePolyline = (raw: string | null | undefined): LngLat[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Validate shape
    if (!Array.isArray(parsed[0]) || parsed[0].length !== 2) return null;
    return parsed as LngLat[];
  } catch {
    return null;
  }
};

/**
 * Returns the closest distance (in meters) from `point` to the polyline,
 * plus the index of the closest vertex. Uses vertex sampling — accurate
 * enough for ride matching with reasonably dense Mapbox polylines.
 */
export const closestPointOnRoute = (
  point: LngLat,
  route: LngLat[]
): { distanceM: number; index: number } => {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = haversineM(point, route[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return { distanceM: minDist, index: minIdx };
};

/**
 * Returns true if `point` lies within `maxDistanceM` meters of the route polyline.
 * Falls back to checking just origin↔destination straight line if no polyline.
 */
/** Distance in meters from point to segment a–b (local equirectangular projection). */
const pointToSegmentM = (p: LngLat, a: LngLat, b: LngLat): number => {
  const kx = Math.cos(toRad(p[1])) * 111320;
  const ky = 110540;
  const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky;
  const bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
};

export const distanceToPolylineM = (point: LngLat, line: LngLat[]): number => {
  if (line.length === 1) return haversineM(point, line[0]);
  let min = Infinity;
  for (let i = 1; i < line.length; i++) {
    const d = pointToSegmentM(point, line[i - 1], line[i]);
    if (d < min) min = d;
  }
  return min;
};

export const isPointNearRoute = (
  point: LngLat,
  route: LngLat[] | null,
  fallbackOrigin: LngLat | null,
  fallbackDestination: LngLat | null,
  maxDistanceM: number
): boolean => {
  if (route && route.length > 1) {
    return distanceToPolylineM(point, route) <= maxDistanceM;
  }
  // No polyline → check against straight line origin→destination
  if (fallbackOrigin && fallbackDestination) {
    return distanceToPolylineM(point, [fallbackOrigin, fallbackDestination]) <= maxDistanceM;
  }
  const c = fallbackOrigin || fallbackDestination;
  if (!c) return true;
  return haversineM(point, c) <= maxDistanceM;
};

/**
 * For an in-progress ride: returns true if the driver has already passed
 * the `point` along the route. Uses polyline vertex indices — driver index
 * past point index means driver is further along the route.
 */
export const hasDriverPassedPoint = (
  point: LngLat,
  driver: LngLat,
  route: LngLat[] | null,
  /** Buffer in vertices so being exactly at the pickup isn't "passed". */
  bufferVertices = 2
): boolean => {
  if (!route || route.length < 2) return false;
  const pointHit = closestPointOnRoute(point, route);
  const driverHit = closestPointOnRoute(driver, route);
  return driverHit.index > pointHit.index + bufferVertices;
};
