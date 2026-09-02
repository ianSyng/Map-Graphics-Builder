import type { Graphic, GraphicKind, LatLng } from "@/types/graphic";
import { isCmLinePointGraphic } from "./cmLine";
import { resizeRectCorner } from "./rectangle";

export function minVertices(kind: GraphicKind): number {
  if (kind === "polygon") return 3;
  if (kind === "rectangle") return 4;
  if (kind === "line") return 2;
  return 1;
}

export function moveVertex(
  graphic: Graphic,
  index: number,
  ll: LatLng,
): Graphic {
  if (graphic.kind === "rectangle") return resizeRectCorner(graphic, index, ll);
  if (isCmLinePointGraphic(graphic)) {
    if (index !== 0) return graphic;
    return { ...graphic, positions: [ll] };
  }
  if (index < 0 || index >= graphic.positions.length) return graphic;
  const positions = graphic.positions.map((p, i) => (i === index ? ll : p));
  return { ...graphic, positions };
}

export function insertVertex(
  graphic: Graphic,
  index: number,
  ll: LatLng,
): Graphic {
  if (graphic.kind !== "line" && graphic.kind !== "polygon") return graphic;
  if (isCmLinePointGraphic(graphic)) return graphic;
  const at = Math.max(0, Math.min(index, graphic.positions.length));
  const positions = [
    ...graphic.positions.slice(0, at),
    ll,
    ...graphic.positions.slice(at),
  ];
  return { ...graphic, positions };
}

export function removeVertex(graphic: Graphic, index: number): Graphic {
  if (graphic.kind !== "line" && graphic.kind !== "polygon") return graphic;
  if (isCmLinePointGraphic(graphic)) return graphic;
  if (index < 0 || index >= graphic.positions.length) return graphic;
  if (graphic.positions.length <= minVertices(graphic.kind)) return graphic;
  const positions = graphic.positions.filter((_, i) => i !== index);
  return { ...graphic, positions };
}

export function translateGraphic(
  graphic: Graphic,
  dLat: number,
  dLng: number,
): Graphic {
  if (dLat === 0 && dLng === 0) return graphic;
  const positions = graphic.positions.map(
    ([lat, lng]) => [lat + dLat, lng + dLng] as LatLng,
  );
  return { ...graphic, positions };
}

export function setCircleRadius(graphic: Graphic, radiusM: number): Graphic {
  if (graphic.kind !== "circle") return graphic;
  return { ...graphic, radiusM: Math.max(1, radiusM) };
}
