import type { GpsCoordinates } from '../domain/GpsCoordinates';

export function haversineKm(a: GpsCoordinates, b: GpsCoordinates): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface OsrmRoute {
  distance: number;
  duration: number;
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

export async function fetchRoadRoute(
  from: GpsCoordinates,
  to: GpsCoordinates,
): Promise<{ distanceM: number; durationS: number } | null> {
  // OSRM expects lng,lat order
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;

  try {
    const res = await fetch(url);
    const data: OsrmResponse = await res.json() as OsrmResponse;
    const route = data.routes?.[0];
    if (!route) return null;
    return { distanceM: route.distance, durationS: route.duration };
  } catch {
    return null;
  }
}