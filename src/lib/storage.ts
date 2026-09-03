import type { Graphic } from "@/types/graphic";
import { isCmAreaGraphic } from "./cmArea";
import { CM_INK, isCmLineGraphic } from "./cmLine";
import { cleanLatLngs } from "./latlng";
import { normalizeLinearTarget } from "./linearTarget";

const KEY = "mgb.graphics.v1";

export function loadGraphics(): Graphic[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const g = item as Graphic;
      const cleaned: Graphic = {
        ...g,
        positions: cleanLatLngs(g.positions),
        color:
          isCmLineGraphic(g) || isCmAreaGraphic(g) ? CM_INK : g.color,
      };
      return [normalizeLinearTarget(cleaned)];
    });
  } catch {
    return [];
  }
}

export function saveGraphics(graphics: Graphic[]): void {
  localStorage.setItem(KEY, JSON.stringify(graphics));
}
