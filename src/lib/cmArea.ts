import { findControlMeasure } from "../catalogs/controlMeasurePoints";
import type { GraphicSymbol } from "../domain/sidc";
import type { Graphic, LatLng } from "../types/graphic";

export function isCmAreaGraphic(g: Graphic): boolean {
  return (
    (g.kind === "circle" || g.kind === "polygon") &&
    g.symbol != null &&
    findControlMeasure(g.symbol.entity)?.geometry === "area"
  );
}

export function isCmCircleArea(g: Graphic): boolean {
  return isCmAreaGraphic(g) && g.kind === "circle";
}

export function isCmPolygonArea(g: Graphic): boolean {
  return isCmAreaGraphic(g) && g.kind === "polygon";
}

export function isCircularTarget(entity: string | undefined): boolean {
  return entity === "240803";
}

export function areaCentroid(positions: LatLng[]): LatLng | null {
  if (positions.length === 0) return null;
  let lat = 0;
  let lng = 0;
  for (const p of positions) {
    lat += p[0];
    lng += p[1];
  }
  const n = positions.length;
  return [lat / n, lng / n];
}

export function cmAreaLabelLines(
  def: { abbrev: string; name: string } | undefined,
  symbol: GraphicSymbol | undefined,
): string[] {
  const abbrev = def?.abbrev.trim() ?? "";
  const t = symbol?.uniqueDesignation?.trim() ?? "";
  const dtg = symbol?.dtg?.trim() ?? "";
  const ap = symbol?.targetNumber?.trim() ?? "";
  const lines: string[] = [];
  if (isCircularTarget(symbol?.entity)) {
    if (ap) lines.push(ap);
    else if (t) lines.push(t);
    else if (abbrev) lines.push(abbrev);
    if (ap && t) lines.push(t);
    if (dtg) lines.push(dtg);
    return lines;
  }
  if (abbrev) lines.push(abbrev);
  if (t && t !== abbrev) lines.push(t);
  if (!abbrev && !t && def?.name) lines.push(def.name);
  if (dtg) lines.push(dtg);
  return lines;
}
