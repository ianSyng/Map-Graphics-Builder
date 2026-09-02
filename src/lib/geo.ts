import L from "leaflet";
import type { LatLng } from "@/types/graphic";

export function distanceM(a: LatLng, b: LatLng): number {
  return L.latLng(a[0], a[1]).distanceTo(L.latLng(b[0], b[1]));
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Point `meters` east of `center` — used for the circle radius handle. */
export function offsetEast(center: LatLng, meters: number): LatLng {
  const latRad = (center[0] * Math.PI) / 180;
  const metersPerDeg = 111320 * Math.max(0.05, Math.cos(latRad));
  return [center[0], center[1] + meters / metersPerDeg];
}
