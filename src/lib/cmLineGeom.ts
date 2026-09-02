import type { LatLng } from "../types/graphic";
import {
  bearingDeg,
  destination,
  distanceMeters,
  localToGeo,
} from "./geodesy";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function pathLengthM(pts: LatLng[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a && b) n += distanceMeters(a, b);
  }
  return n;
}

export function decorationScale(pts: LatLng[]): {
  spacingM: number;
  tickM: number;
  scallopR: number;
  arrowLen: number;
  arrowW: number;
} {
  const len = Math.max(1, pathLengthM(pts));
  const spacingM = clamp(len / 12, 250, 12000);
  const tickM = clamp(len * 0.03, 50, 2000);
  return {
    spacingM,
    tickM,
    scallopR: spacingM * 0.42,
    arrowLen: clamp(len * 0.1, 150, 5000),
    arrowW: clamp(len * 0.05, 80, 2200),
  };
}

/** Keep label text right-side-up while parallel to `bearing` (0 = north). */
export function labelRotationDeg(bearing: number): number {
  let r = bearing - 90;
  r = ((r % 360) + 360) % 360;
  if (r > 90 && r < 270) r += 180;
  return ((r % 360) + 360) % 360;
}

export type PathSample = { at: LatLng; bearing: number; distM: number };

export function samplePath(pts: LatLng[], spacingM: number): PathSample[] {
  if (pts.length < 2 || spacingM <= 0) return [];
  const out: PathSample[] = [];
  let acc = 0;
  let next = spacingM;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    const seg = distanceMeters(a, b);
    if (seg < 1) continue;
    const br = bearingDeg(a, b);
    while (next <= acc + seg) {
      const t = (next - acc) / seg;
      out.push({
        at: [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
        ],
        bearing: br,
        distM: next,
      });
      next += spacingM;
    }
    acc += seg;
  }
  return out;
}

export function tCapSegment(at: LatLng, bearing: number, halfM: number): LatLng[] {
  return [
    localToGeo(at, bearing, 0, -halfM),
    localToGeo(at, bearing, 0, halfM),
  ];
}

/** Semicircle bumps on the left of the draw direction (enemy-side convention). */
export function flotScallops(
  pts: LatLng[],
  spacingM: number,
  radiusM: number,
): LatLng[][] {
  const samples = samplePath(pts, Math.max(radiusM * 2.05, spacingM));
  const out: LatLng[][] = [];
  for (const s of samples) {
    const ring: LatLng[] = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const ang = s.bearing + 180 + (i / steps) * 180;
      ring.push(destination(s.at, ang, radiusM));
    }
    if (ring.length >= 2) out.push(ring);
  }
  return out;
}

/** Square crenels on the left — FEBA vs FLOT scallops. */
export function febaCrenels(
  pts: LatLng[],
  spacingM: number,
  depthM: number,
): LatLng[][] {
  const samples = samplePath(pts, Math.max(depthM * 2.2, spacingM));
  const out: LatLng[][] = [];
  for (const s of samples) {
    const a = localToGeo(s.at, s.bearing, -depthM, 0);
    const b = localToGeo(s.at, s.bearing, -depthM, -depthM);
    const c = localToGeo(s.at, s.bearing, depthM, -depthM);
    const d = localToGeo(s.at, s.bearing, depthM, 0);
    out.push([a, b, c, d]);
  }
  return out;
}

export function offsetPolyline(pts: LatLng[], rightM: number): LatLng[] {
  if (pts.length < 2) return pts.slice();
  return pts.map((p, i) => {
    const br =
      i === 0
        ? bearingDeg(p, pts[1]!)
        : i === pts.length - 1
          ? bearingDeg(pts[i - 1]!, p)
          : bearingDeg(pts[i - 1]!, pts[i + 1]!);
    return localToGeo(p, br, 0, rightM);
  });
}

export function arrowHead(
  tip: LatLng,
  bearing: number,
  lengthM: number,
  widthM: number,
): LatLng[] {
  const left = localToGeo(tip, bearing, -lengthM, -widthM / 2);
  const right = localToGeo(tip, bearing, -lengthM, widthM / 2);
  return [tip, left, right];
}

export type LabelAlign = "center" | "start" | "end";

export type PhaseEndLabel = { dx: number; dy: number; align: "start" | "end" };

/**
 * Horizontal “PL T” labels sit clear of the terminations:
 * left end → text to the left (unique designation nearest the line);
 * right end → text to the right (“PL” nearest the line).
 */
export function phaseEndLabelLayout(
  start: { x: number; y: number },
  end: { x: number; y: number },
  gapPx: number,
): { start: PhaseEndLabel; end: PhaseEndLabel } {
  const left: PhaseEndLabel = { dx: -gapPx, dy: 0, align: "end" };
  const right: PhaseEndLabel = { dx: gapPx, dy: 0, align: "start" };
  return start.x <= end.x
    ? { start: left, end: right }
    : { start: right, end: left };
}

export type BoundaryLabelAxis = "ns" | "ew";

/**
 * Line closer to east-west (≤45° from horizontal) → T1 north / T2 south.
 * Steeper than 45° → T1 west / T2 east.
 */
export function boundaryLabelAxis(bearing: number): BoundaryLabelAxis {
  const folded = ((bearing % 180) + 180) % 180;
  return Math.abs(folded - 90) <= 45 ? "ns" : "ew";
}

export function boundaryTOffsets(
  mid: LatLng,
  bearing: number,
  offsetM: number,
): { t1: LatLng; t2: LatLng } {
  if (boundaryLabelAxis(bearing) === "ns") {
    return {
      t1: destination(mid, 0, offsetM),
      t2: destination(mid, 180, offsetM),
    };
  }
  return {
    t1: destination(mid, 270, offsetM),
    t2: destination(mid, 90, offsetM),
  };
}

/** Point at `fraction` (0–1) of path length, with the bearing of that segment. */
export function pointAlongPath(
  pts: LatLng[],
  fraction: number,
): { at: LatLng; bearing: number } | null {
  if (pts.length < 2) return null;
  const total = pathLengthM(pts);
  if (total < 1) {
    const a = pts[0];
    const b = pts[1];
    if (!a || !b) return null;
    return { at: a, bearing: bearingDeg(a, b) };
  }
  const target = total * Math.min(1, Math.max(0, fraction));
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    const seg = distanceMeters(a, b);
    if (seg < 1) continue;
    if (acc + seg >= target || i === pts.length - 1) {
      const t = seg < 1 ? 0 : Math.min(1, (target - acc) / seg);
      return {
        at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        bearing: bearingDeg(a, b),
      };
    }
    acc += seg;
  }
  return null;
}

export function terminalBearings(pts: LatLng[]): {
  start: number;
  end: number;
} | null {
  if (pts.length < 2) return null;
  const a0 = pts[0];
  const a1 = pts[1];
  const b0 = pts[pts.length - 2];
  const b1 = pts[pts.length - 1];
  if (!a0 || !a1 || !b0 || !b1) return null;
  return { start: bearingDeg(a1, a0), end: bearingDeg(b0, b1) };
}
