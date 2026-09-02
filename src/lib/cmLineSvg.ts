/**
 * Fixed-size SVG for Linear Target (and leftover 1-vertex 2525 lines).
 * Drawn 2525 lines stay map polylines; this is the point-icon exception.
 */

import { findControlMeasure } from "../catalogs/controlMeasurePoints";
import { echelonMark } from "../domain/sidc";
import type { Graphic } from "../types/graphic";
import { CM_HALO } from "./cmLine";
import { fireSystemMark, isLinearTarget, linearTargetKind } from "./linearTarget";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function glyphPaths(draw: string | undefined, dashed: boolean): string {
  const dash =
    dashed || draw === "light" || draw === "arrow-dashed"
      ? `stroke-dasharray="4 3"`
      : "";
  const arrow =
    draw === "arrow" || draw === "arrow-double" || draw === "arrow-dashed";
  const parts: string[] = [];
  if (draw === "flot") {
    for (const x of [8, 20, 32]) {
      parts.push(`<path d="M ${x} 18 A 6 6 0 0 0 ${x + 12} 18" fill="none" ${dash}/>`);
    }
  } else {
    const x1 = draw === "phase" || draw === "ends" ? 12 : 2;
    const x2 = arrow ? 36 : draw === "phase" || draw === "ends" ? 36 : 46;
    parts.push(`<line x1="${x1}" y1="18" x2="${x2}" y2="18" ${dash}/>`);
  }
  if (draw === "light" || draw === "ibeam" || draw === "phase" || draw === "ends") {
    parts.push(
      `<line x1="2" y1="13" x2="2" y2="23"/>`,
      `<line x1="46" y1="13" x2="46" y2="23"/>`,
    );
  }
  if (draw === "feba") {
    for (const x of [10, 22, 34]) {
      parts.push(
        `<path d="M ${x - 4} 18 L ${x - 4} 12 L ${x + 4} 12 L ${x + 4} 18" fill="none"/>`,
      );
    }
  }
  if (arrow) {
    parts.push(`<path d="M34 13 L46 18 L34 23 Z"/>`);
  }
  return parts.join("");
}

function glyph(draw: string | undefined, color: string, dashed: boolean): string {
  const paths = glyphPaths(draw, dashed);
  const label =
    draw === "boundary"
      ? `<text x="24" y="11" text-anchor="middle" fill="${esc(color)}" stroke="${esc(CM_HALO)}" stroke-width="3" paint-order="stroke fill" font-size="8" font-family="Segoe UI,sans-serif">BNDRY</text>`
      : "";
  return `<g fill="none" stroke="${esc(CM_HALO)}" stroke-width="3.5" stroke-linecap="square" stroke-linejoin="round">${paths}</g>
    <g fill="${esc(color)}" stroke="${esc(color)}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="round">${paths}</g>
    ${label}`;
}

export function cmLineSvg(
  graphic: Pick<Graphic, "headingDeg" | "symbol"> &
    Partial<Pick<Graphic, "dash">>,
  color: string,
  selected: boolean,
): { html: string; width: number; height: number; anchorX: number; anchorY: number } {
  const def = graphic.symbol
    ? findControlMeasure(graphic.symbol.entity)
    : undefined;
  const draw = def?.lineDraw;
  const planned = graphic.symbol?.status === "1" || graphic.dash === "dashed";
  const rot = (graphic.headingDeg ?? 90) - 90;
  const weightNote = selected ? 1 : 0;

  const above: string[] = [];
  const below: string[] = [];
  if (isLinearTarget(graphic.symbol?.entity)) {
    const kind = linearTargetKind(graphic.symbol?.entity);
    const ap = graphic.symbol?.targetNumber?.trim() ?? "";
    const unit = graphic.symbol?.uniqueDesignation?.trim() ?? "";
    const sys = fireSystemMark(graphic.symbol?.equipmentType);
    if (ap) above.push(ap);
    if (kind.mark) below.push(kind.mark);
    if (unit) below.push(unit);
    if (sys) below.push(sys);
  } else if (draw === "boundary") {
    const t1 = graphic.symbol?.uniqueDesignation?.trim() ?? "";
    const t2 = graphic.symbol?.uniqueDesignation2?.trim() ?? "";
    const b = echelonMark(graphic.symbol?.fieldB);
    if (t1) above.push(t1);
    if (b) below.push(b);
    if (t2) below.push(t2);
  } else {
    const cap = [
      def?.abbrev.trim() ?? "",
      graphic.symbol?.uniqueDesignation?.trim() ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    if (cap) above.push(cap);
  }

  const padTop = above.length ? above.length * 14 + 4 : 8;
  const padBot = below.length ? below.length * 14 + 6 : 8;
  const gw = 72;
  const gh = 36;
  const w = 88;
  const h = padTop + gh + padBot;
  const cx = w / 2;
  const cy = padTop + gh / 2;

  const texts: string[] = [];
  above.forEach((t, i) => {
    texts.push(
      `<text x="${cx}" y="${14 + i * 14}" text-anchor="middle" fill="${esc(color)}" stroke="${esc(CM_HALO)}" stroke-width="3" paint-order="stroke fill" font-size="11" font-weight="700" font-family="Segoe UI,sans-serif">${esc(t)}</text>`,
    );
  });
  below.forEach((t, i) => {
    texts.push(
      `<text x="${cx}" y="${padTop + gh + 12 + i * 14}" text-anchor="middle" fill="${esc(color)}" stroke="${esc(CM_HALO)}" stroke-width="3" paint-order="stroke fill" font-size="11" font-weight="700" font-family="Segoe UI,sans-serif">${esc(t)}</text>`,
    );
  });

  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" overflow="visible">
    <g transform="translate(${cx - gw / 2},${padTop}) rotate(${rot}, ${gw / 2}, ${gh / 2})">
      <svg viewBox="0 0 48 24" width="${gw}" height="${gh}" overflow="visible">${glyph(draw, color, planned)}</svg>
    </g>
    ${texts.join("")}
  </svg>`;
  return { html, width: w, height: h, anchorX: cx, anchorY: cy + weightNote };
}
