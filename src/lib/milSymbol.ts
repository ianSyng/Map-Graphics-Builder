import milsymbol from "milsymbol";
import type { GraphicSymbol } from "@/domain/sidc";

type Drawn = {
  asSVG: () => string;
  getSize: () => { width: number; height: number };
  getAnchor: () => { x: number; y: number };
};

type MsModule = {
  Symbol: new (sidc: string, options?: Record<string, unknown>) => Drawn;
};

function getMs(): MsModule | null {
  const mod = milsymbol as unknown as MsModule & { default?: MsModule };
  if (mod && typeof mod.Symbol === "function") return mod;
  if (mod?.default && typeof mod.default.Symbol === "function") return mod.default;
  return null;
}

/**
 * Appendix H points are unframed line-art. Keep them as strokes on a dark map.
 * Do not fill — C2 flags are closed paths and a fill turns every one into the
 * same solid pennant, hiding the letters that distinguish them.
 */
const DRAW_OPTS = {
  frame: false,
  fill: false,
  icon: true,
  monoColor: "#e2e8f0",
  outlineWidth: 1,
  outlineColor: "#020617",
  infoColor: "#e2e8f0",
  strokeWidth: 3,
} as const;

function optionalText(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function draw(symbol: GraphicSymbol, size: number): Drawn | null {
  const ms = getMs();
  if (!ms) return null;
  const uniqueDesignation = optionalText(symbol.uniqueDesignation);
  const additionalInformation = optionalText(symbol.additionalInformation);
  const dtg = optionalText(symbol.dtg);
  return new ms.Symbol(symbol.sidc, {
    size,
    ...DRAW_OPTS,
    ...(uniqueDesignation ? { uniqueDesignation } : {}),
    ...(additionalInformation ? { additionalInformation } : {}),
    ...(dtg ? { dtg } : {}),
  });
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function renderMilSymbolSvg(symbol: GraphicSymbol, size = 28): string {
  try {
    const drawn = draw(symbol, size);
    if (!drawn) {
      console.warn("milsymbol: library not loaded");
      return "";
    }
    return drawn.asSVG() || "";
  } catch (err) {
    console.warn("milsymbol: render failed", err);
    return "";
  }
}

export function renderMilSymbolDataUrl(symbol: GraphicSymbol, size = 28): string {
  const svg = renderMilSymbolSvg(symbol, size);
  return svg ? svgToDataUrl(svg) : "";
}

export function milSymbolMetrics(symbol: GraphicSymbol, size = 32): {
  svg: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
} | null {
  try {
    const drawn = draw(symbol, size);
    if (!drawn) return null;
    const svg = drawn.asSVG();
    if (!svg) return null;
    const dim = drawn.getSize() || { width: size, height: size };
    const anchor = drawn.getAnchor() || { x: dim.width / 2, y: dim.height / 2 };
    const width = Math.max(12, Math.round(dim.width) || size);
    const height = Math.max(12, Math.round(dim.height) || size);
    return {
      svg,
      width,
      height,
      anchorX: Math.round(anchor.x) || width / 2,
      anchorY: Math.round(anchor.y) || height / 2,
    };
  } catch {
    return null;
  }
}
