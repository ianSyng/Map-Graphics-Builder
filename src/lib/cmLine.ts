import type { ControlMeasureDef } from "../catalogs/controlMeasurePoints";
import type { GraphicSymbol } from "../domain/sidc";
import type { Graphic, LatLng } from "../types/graphic";
import { bearingDeg } from "./geodesy";
import { isLinearTarget } from "./linearTarget";

/** Same ink as milsymbol 2525 points (monoColor + outline). */
export const CM_INK = "#e2e8f0";
export const CM_HALO = "#020617";
export const CM_INK_SELECTED = "#fbbf24";

/** 2525 identity colors, light enough to read on the dark basemap. */
export const IDENTITY_STROKE: Record<string, string> = {
  "00": "#94a3b8",
  "01": "#facc15",
  "03": "#7dd3fc",
  "04": "#4ade80",
  "06": "#f87171",
};

export function isCmLineGraphic(g: Graphic): boolean {
  return g.kind === "line" && g.symbol != null;
}

/** Linear target, or a leftover 1-vertex 2525 line, rendered as a point icon. */
export function isCmLinePointGraphic(g: Graphic): boolean {
  return (
    isCmLineGraphic(g) &&
    (isLinearTarget(g.symbol?.entity) || g.positions.length < 2)
  );
}

export function cmLineAnchor(g: Graphic): LatLng | null {
  const a = g.positions[0];
  if (!a) return null;
  const b = g.positions[g.positions.length - 1];
  if (!b || g.positions.length === 1) return a;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Linear targets only — never collapse a drawn 2525 polyline to a point. */
export function normalizeCmLineGraphic(g: Graphic): Graphic {
  if (!isLinearTarget(g.symbol?.entity)) return g;
  const at = cmLineAnchor(g);
  if (!at) return g;
  return {
    ...g,
    positions: [at],
    headingDeg: g.headingDeg ?? 90,
  };
}

export function cmStrokeColor(_identity: string, selected = false): string {
  return selected ? CM_INK_SELECTED : CM_INK;
}

export function cmLineCaption(
  def: ControlMeasureDef | undefined,
  symbol: GraphicSymbol,
): string {
  const abbrev = def?.abbrev.trim() ?? "";
  const t = symbol.uniqueDesignation?.trim() ?? "";
  if (abbrev && t) return `${abbrev} ${t}`;
  if (abbrev) return abbrev;
  if (t) return t;
  return def?.name ?? "";
}

export function segmentBearing(from: LatLng, to: LatLng): number {
  return bearingDeg(from, to);
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function lineMidpoint(positions: LatLng[]): LatLng | null {
  if (positions.length === 0) return null;
  if (positions.length === 1) return positions[0] ?? null;
  const mid = Math.floor((positions.length - 1) / 2);
  const a = positions[mid];
  const b = positions[mid + 1] ?? a;
  if (!a || !b) return null;
  return midpoint(a, b);
}
