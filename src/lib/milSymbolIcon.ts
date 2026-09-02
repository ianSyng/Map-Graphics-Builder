import L from "leaflet";
import { milSymbolMetrics, svgToDataUrl } from "@/lib/milSymbol";
import type { GraphicSymbol } from "@/domain/sidc";

const FALLBACK_HTML =
  '<div style="width:16px;height:16px;border:1px solid #94a3b8;background:#1e293b"></div>';

export function milSymbolIcon(symbol: GraphicSymbol, size = 32): L.DivIcon {
  const fallback = L.divIcon({
    className: "mil-symbol-fallback",
    html: FALLBACK_HTML,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  const drawn = milSymbolMetrics(symbol, size);
  if (!drawn) return fallback;
  const src = svgToDataUrl(drawn.svg);
  return L.divIcon({
    className: "mil-symbol",
    html: `<img src="${src}" width="${drawn.width}" height="${drawn.height}" alt="" draggable="false" />`,
    iconSize: [drawn.width, drawn.height],
    iconAnchor: [drawn.anchorX, drawn.anchorY],
  });
}