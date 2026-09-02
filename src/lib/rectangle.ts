import {
  bearingDeg,
  distanceMeters,
  eastNorth,
  localToGeo,
  normalizeHeading,
} from "./geodesy";
import type { Graphic, LatLng } from "../types/graphic";

export interface RectModel {
  center: LatLng;
  /** Meters along heading (attitude). */
  lengthM: number;
  /** Meters perpendicular to heading. */
  widthM: number;
  /** Degrees, 0 = north, clockwise. */
  headingDeg: number;
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Corners clockwise: FR, FL, BL, BR (forward = heading). */
export function cornersFromRect(rect: RectModel): LatLng[] {
  const hf = Math.max(1, rect.lengthM) / 2;
  const hr = Math.max(1, rect.widthM) / 2;
  const h = rect.headingDeg;
  const c = rect.center;
  return [
    localToGeo(c, h, hf, hr),
    localToGeo(c, h, hf, -hr),
    localToGeo(c, h, -hf, -hr),
    localToGeo(c, h, -hf, hr),
  ];
}

export function rotationHandle(rect: RectModel): LatLng {
  const pad = Math.max(rect.lengthM, rect.widthM) * 0.2 + 1;
  return localToGeo(rect.center, rect.headingDeg, rect.lengthM / 2 + pad, 0);
}

/** Axis-aligned box from opposite corners, then rotate around center. */
export function rectFromDrag(
  a: LatLng,
  b: LatLng,
  headingDeg: number,
): RectModel {
  const aligned = rectFromOppositeCorners(a, b, 0);
  return { ...aligned, headingDeg: normalizeHeading(headingDeg) };
}

export function rectFromOppositeCorners(
  a: LatLng,
  b: LatLng,
  headingDeg: number,
): RectModel {
  const center = midpoint(a, b);
  const { east, north } = eastNorth(center, b);
  const h = (headingDeg * Math.PI) / 180;
  const fwd = north * Math.cos(h) + east * Math.sin(h);
  const right = east * Math.cos(h) - north * Math.sin(h);
  return {
    center,
    lengthM: Math.max(1, Math.abs(fwd) * 2),
    widthM: Math.max(1, Math.abs(right) * 2),
    headingDeg: normalizeHeading(headingDeg),
  };
}

export function rectFromGraphic(graphic: Graphic): RectModel | null {
  if (graphic.kind !== "rectangle" || graphic.positions.length < 4) return null;
  const pts = graphic.positions.slice(0, 4);
  const center: LatLng = [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
  const fr = pts[0];
  const fl = pts[1];
  const bl = pts[2];
  if (!fr || !fl || !bl) return null;
  const fwdMid = midpoint(fr, fl);
  const heading =
    graphic.headingDeg != null
      ? normalizeHeading(graphic.headingDeg)
      : bearingDeg(center, fwdMid);
  const lengthM = Math.max(1, distanceMeters(center, fwdMid) * 2);
  const rightMid = midpoint(fr, pts[3] ?? fr);
  const widthM = Math.max(1, distanceMeters(center, rightMid) * 2);
  return { center, lengthM, widthM, headingDeg: heading };
}

export function applyRect(graphic: Graphic, rect: RectModel): Graphic {
  return {
    ...graphic,
    kind: "rectangle",
    positions: cornersFromRect(rect),
    headingDeg: normalizeHeading(rect.headingDeg),
  };
}

export function resizeRectCorner(
  graphic: Graphic,
  index: number,
  ll: LatLng,
): Graphic {
  const model = rectFromGraphic(graphic);
  const corners = graphic.positions;
  if (!model || corners.length < 4) return graphic;
  const opposite = corners[(index + 2) % 4];
  if (!opposite) return graphic;
  return applyRect(
    graphic,
    rectFromOppositeCorners(opposite, ll, model.headingDeg),
  );
}

export function setRectHeading(graphic: Graphic, headingDeg: number): Graphic {
  const model = rectFromGraphic(graphic);
  if (!model) return graphic;
  return applyRect(graphic, {
    ...model,
    headingDeg: normalizeHeading(headingDeg),
  });
}

export function setRectSize(
  graphic: Graphic,
  patch: { lengthM?: number; widthM?: number },
): Graphic {
  const model = rectFromGraphic(graphic);
  if (!model) return graphic;
  return applyRect(graphic, {
    ...model,
    lengthM: Math.max(1, patch.lengthM ?? model.lengthM),
    widthM: Math.max(1, patch.widthM ?? model.widthM),
  });
}
