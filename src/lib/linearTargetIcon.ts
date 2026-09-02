import L from "leaflet";
import { linearTargetSvg } from "./linearTargetSvg";
import type { Graphic } from "../types/graphic";

export function makeLinearTargetIcon(
  graphic: Pick<Graphic, "headingDeg" | "symbol"> &
    Partial<Pick<Graphic, "dash">>,
  color: string,
  selected: boolean,
): L.DivIcon {
  const drawn = linearTargetSvg(graphic, color, selected);
  return L.divIcon({
    className: "cm-line-label",
    html: drawn.html,
    iconSize: [drawn.width, drawn.height],
    iconAnchor: [drawn.anchorX, drawn.anchorY],
  });
}
