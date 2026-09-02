import type { LatLng } from "../types/graphic";

/** Leaflet `_projectLatlngs` throws if the first vertex is null or `[null, null]`. */
export function isFiniteLatLng(p: unknown): p is LatLng {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    typeof p[0] === "number" &&
    typeof p[1] === "number" &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1])
  );
}

export function cleanLatLngs(pts: unknown): LatLng[] {
  if (!Array.isArray(pts)) return [];
  const out: LatLng[] = [];
  for (const p of pts) {
    if (isFiniteLatLng(p)) out.push([p[0], p[1]]);
  }
  return out;
}

/** Polyline needs ≥2 real vertices. */
export function polylinePath(pts: unknown): LatLng[] | null {
  const clean = cleanLatLngs(pts);
  return clean.length >= 2 ? clean : null;
}

/** Polygon needs ≥3 real vertices; never pass holes/null rings. */
export function polygonPath(pts: unknown): LatLng[] | null {
  const clean = cleanLatLngs(pts);
  return clean.length >= 3 ? clean : null;
}

export function samePath(a: LatLng[] | null, b: LatLng[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (!p || !q || p[0] !== q[0] || p[1] !== q[1]) return false;
  }
  return true;
}
