import { offsetMeters } from "./geodesy";
import { isCmLinePointGraphic } from "./cmLine";
import type { Graphic, LatLng } from "../types/graphic";

export interface GeoBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export function boxFromCorners(a: LatLng, b: LatLng): GeoBox {
  return {
    south: Math.min(a[0], b[0]),
    north: Math.max(a[0], b[0]),
    west: Math.min(a[1], b[1]),
    east: Math.max(a[1], b[1]),
  };
}

export function boxesOverlap(a: GeoBox, b: GeoBox): boolean {
  return !(
    a.east < b.west ||
    a.west > b.east ||
    a.north < b.south ||
    a.south > b.north
  );
}

export function graphicBounds(g: Graphic): GeoBox | null {
  if (g.kind === "circle" && g.positions[0]) {
    const c = g.positions[0];
    const r = Math.max(1, g.radiusM ?? 500);
    const north = offsetMeters(c, 0, r);
    const south = offsetMeters(c, 0, -r);
    const east = offsetMeters(c, r, 0);
    const west = offsetMeters(c, -r, 0);
    return {
      south: south[0],
      north: north[0],
      west: west[1],
      east: east[1],
    };
  }
  if (isCmLinePointGraphic(g) && g.positions[0]) {
    const c = g.positions[0];
    return { south: c[0], north: c[0], west: c[1], east: c[1] };
  }
  const pts = g.positions;
  const first = pts[0];
  if (!first) return null;
  let south = first[0];
  let north = first[0];
  let west = first[1];
  let east = first[1];
  for (const [lat, lng] of pts) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  return { south, north, west, east };
}

export function idsIntersectingBox(
  graphics: Graphic[],
  a: LatLng,
  b: LatLng,
): string[] {
  const box = boxFromCorners(a, b);
  const ids: string[] = [];
  for (const g of graphics) {
    const gb = graphicBounds(g);
    if (gb && boxesOverlap(box, gb)) ids.push(g.id);
  }
  return ids;
}
