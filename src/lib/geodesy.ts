import type { LatLng } from "../types/graphic";

const EARTH_M = 6371000;

/** Destination from `center` going `meters` along `bearingDeg` (0 = north). */
export function destination(
  center: LatLng,
  bearingDeg: number,
  meters: number,
): LatLng {
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (center[0] * Math.PI) / 180;
  const lng1 = (center[1] * Math.PI) / 180;
  const ang = meters / EARTH_M;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) +
      Math.cos(lat1) * Math.sin(ang) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

export function normalizeHeading(deg: number): number {
  const h = deg % 360;
  return h < 0 ? h + 360 : h;
}

/** NATO artillery mils: 6400 mils = 360°. 0 = north, clockwise. */
export const MILS_PER_CIRCLE = 6400;

export function normalizeMils(mils: number): number {
  const n = Math.round(mils) % MILS_PER_CIRCLE;
  return n < 0 ? n + MILS_PER_CIRCLE : n;
}

export function degToMils(deg: number): number {
  return normalizeMils((normalizeHeading(deg) * MILS_PER_CIRCLE) / 360);
}

export function milsToDeg(mils: number): number {
  return (normalizeMils(mils) * 360) / MILS_PER_CIRCLE;
}

/** Local east/north offset in meters from `from` to `to`. */
export function eastNorth(
  from: LatLng,
  to: LatLng,
): { east: number; north: number } {
  const lat1 = (from[0] * Math.PI) / 180;
  const dLat = ((to[0] - from[0]) * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  return {
    north: dLat * EARTH_M,
    east: dLng * EARTH_M * Math.cos(lat1),
  };
}

export function offsetMeters(center: LatLng, east: number, north: number): LatLng {
  const latRad = (center[0] * Math.PI) / 180;
  const dLat = (north / EARTH_M) * (180 / Math.PI);
  const dLng =
    (east / (EARTH_M * Math.max(0.05, Math.cos(latRad)))) * (180 / Math.PI);
  return [center[0] + dLat, center[1] + dLng];
}

/** Heading in degrees, 0 = north, clockwise. */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const { east, north } = eastNorth(from, to);
  return normalizeHeading((Math.atan2(east, north) * 180) / Math.PI);
}

export function distanceMeters(from: LatLng, to: LatLng): number {
  const { east, north } = eastNorth(from, to);
  return Math.hypot(east, north);
}

/**
 * Offset from `center` in a heading-aligned frame:
 * `fwd` along heading (meters), `right` 90° clockwise (meters).
 */
export function localToGeo(
  center: LatLng,
  headingDeg: number,
  fwd: number,
  right: number,
): LatLng {
  const h = (headingDeg * Math.PI) / 180;
  const north = fwd * Math.cos(h) - right * Math.sin(h);
  const east = fwd * Math.sin(h) + right * Math.cos(h);
  return offsetMeters(center, east, north);
}

export function circleRing(
  center: LatLng,
  radiusM: number,
  steps = 64,
): LatLng[] {
  const n = Math.max(8, steps);
  const pts: LatLng[] = [];
  for (let i = 0; i < n; i++) {
    pts.push(destination(center, (i * 360) / n, radiusM));
  }
  return pts;
}
