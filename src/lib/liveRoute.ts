export type RoutePoint = { lat: number; lng: number };

// Keep all agreed places, ordered along the original journey, including a custom via point.
export function liveRouteWaypoints(points: RoutePoint[], original: Array<[number, number]>) {
  const unique = points.filter((p, i) => Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
    points.findIndex(q => q.lat === p.lat && q.lng === p.lng) === i);
  const position = (p: RoutePoint) => {
    let index = 0, distance = Infinity;
    original.forEach(([lng, lat], i) => {
      const d = (lng - p.lng) ** 2 + (lat - p.lat) ** 2;
      if (d < distance) { distance = d; index = i; }
    });
    return index;
  };
  return unique.sort((a, b) => position(a) - position(b));
}

export function liveRouteUpdate(coordinates: Array<[number, number]>) {
  if (coordinates.length < 2 || coordinates.some(p => p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) {
    throw new Error('Neplatná cesta.');
  }
  return { live_route_polyline: JSON.stringify(coordinates) };
}