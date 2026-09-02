import { Fragment, useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { ControlMeasureLineDraw } from "@/catalogs/controlMeasurePoints";
import { findControlMeasure } from "@/catalogs/controlMeasurePoints";
import { SafePolygon, SafePolyline } from "@/components/SafePath";
import { CM_HALO, cmLineCaption, cmStrokeColor } from "@/lib/cmLine";
import { cleanLatLngs, isFiniteLatLng } from "@/lib/latlng";
import {
  fireSystemMark,
  isLinearTarget,
  linearTargetKind,
  linearTargetShaft,
} from "@/lib/linearTarget";
import {
  arrowHead,
  decorationScale,
  labelRotationDeg,
  offsetPolyline,
  boundaryLabelAxis,
  phaseEndLabelLayout,
  pointAlongPath,
  terminalBearings,
  type LabelAlign,
} from "@/lib/cmLineGeom";
import { echelonMark } from "@/domain/sidc";
import type { Graphic, LatLng } from "@/types/graphic";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelIcon(
  text: string,
  color: string,
  bearing: number | null,
  plate = false,
  align: LabelAlign = "center",
): L.DivIcon {
  const rot = bearing == null ? 0 : labelRotationDeg(bearing);
  const w = Math.max(
    align === "center" ? 48 : 8,
    text.length * 8 + (plate ? 12 : 2),
  );
  const h = 22;
  const cls = [
    "cm-line-label-text",
    plate ? "" : "cm-line-label-bare",
    align === "start" ? "cm-line-label-start" : "",
    align === "end" ? "cm-line-label-end" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const anchorX = align === "start" ? 0 : align === "end" ? w : w / 2;
  return L.divIcon({
    className: "cm-line-label",
    html: `<span class="${cls}" style="color:${color};transform:rotate(${rot}deg)">${escapeHtml(text)}</span>`,
    iconSize: [w, h],
    iconAnchor: [anchorX, h / 2],
  });
}

function echelonIcon(mark: string, color: string, bearing: number): L.DivIcon {
  const maskW = Math.max(10, mark.length * 9 + 4) * 2;
  const rot = labelRotationDeg(bearing);
  const box = Math.max(40, maskW + 8);
  return L.divIcon({
    className: "cm-line-label",
    html: `<span class="cm-line-echelon" style="color:${color}"><span class="cm-line-echelon-mask" style="width:${maskW}px;transform:translate(-50%,-50%) rotate(${rot}deg)"></span><span class="cm-line-echelon-mark">${escapeHtml(mark)}</span></span>`,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  });
}

function screenOffset(map: L.Map, at: LatLng, dx: number, dy: number): LatLng {
  const pt = map.latLngToLayerPoint(L.latLng(at[0], at[1]));
  const ll = map.layerPointToLatLng(L.point(pt.x + dx, pt.y + dy));
  return [ll.lat, ll.lng];
}

/** Offset perpendicular to `bearing`, preferring screen-up for `above`. */
function offsetPerpScreen(
  map: L.Map,
  at: LatLng,
  bearing: number,
  px: number,
  side: "above" | "below",
): LatLng {
  const rad = (bearing * Math.PI) / 180;
  let dx = Math.cos(rad) * px;
  let dy = Math.sin(rad) * px;
  if (Math.abs(dy) < 0.5) {
    return screenOffset(map, at, 0, side === "above" ? -px : px);
  }
  if (side === "above" && dy > 0) {
    dx = -dx;
    dy = -dy;
  }
  if (side === "below" && dy < 0) {
    dx = -dx;
    dy = -dy;
  }
  return screenOffset(map, at, dx, dy);
}

/** Perpendicular T-cap in screen pixels. */
function tCapPixel(
  map: L.Map,
  at: LatLng,
  bearing: number,
  halfPx: number,
): LatLng[] {
  const rad = (bearing * Math.PI) / 180;
  const x = Math.cos(rad) * halfPx;
  const y = Math.sin(rad) * halfPx;
  return [
    screenOffset(map, at, -x, -y),
    screenOffset(map, at, x, y),
  ];
}

/** FLOT arcs in screen space. Open side of the arc faces the reported unit (left of draw). */
/**
 * FLOT as a chain of semicircles only (no baseline).
 * Apex is to the left of draw direction: L→R → north, T→B → east.
 */
function mapHasView(map: L.Map): boolean {
  try {
    const size = map.getSize();
    if (size.x < 2 || size.y < 2) return false;
    return map.getPixelOrigin() != null;
  } catch {
    return false;
  }
}

function flotScallopsPx(map: L.Map, pts: LatLng[], radiusPx: number): LatLng[] {
  if (pts.length < 2 || !mapHasView(map)) return [];
  const layer: { x: number; y: number }[] = [];
  for (const p of pts) {
    if (!isFiniteLatLng(p)) continue;
    const pt = map.latLngToLayerPoint(L.latLng(p[0], p[1]));
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
    layer.push(pt);
  }
  if (layer.length < 2) return [];
  let total = 0;
  for (let i = 1; i < layer.length; i++) {
    const a = layer[i - 1]!;
    const b = layer[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (total < 4) return [];
  const r = Math.min(radiusPx, total / 2);
  const spacing = r * 2;
  const steps = 10;

  const atDist = (dist: number): { x: number; y: number; ang: number } | null => {
    let acc = 0;
    for (let i = 1; i < layer.length; i++) {
      const a = layer[i - 1]!;
      const b = layer[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const seg = Math.hypot(dx, dy);
      if (seg < 1) continue;
      if (acc + seg >= dist || i === layer.length - 1) {
        const t = Math.min(1, (dist - acc) / Math.max(seg, 1));
        return { x: a.x + dx * t, y: a.y + dy * t, ang: Math.atan2(dy, dx) };
      }
      acc += seg;
    }
    return null;
  };

  const path: LatLng[] = [];
  for (let center = r; center + r <= total + 0.5; center += spacing) {
    const c = atDist(center);
    if (!c) break;
    for (let k = 0; k <= steps; k++) {
      if (k === 0 && path.length > 0) continue;
      const a2 = c.ang + Math.PI + (k / steps) * Math.PI;
      const ll = map.layerPointToLatLng(
        L.point(c.x + Math.cos(a2) * r, c.y + Math.sin(a2) * r),
      );
      if (!Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) continue;
      path.push([ll.lat, ll.lng]);
    }
  }
  return path;
}

function phaseEndCaption(
  abbrev: string,
  unique: string | undefined,
): string {
  const a = abbrev.trim();
  const t = unique?.trim() ?? "";
  if (a && t) return `${a} ${t}`;
  return a || t;
}

function resolveDraw(draw?: ControlMeasureLineDraw): ControlMeasureLineDraw {
  if (!draw || draw === "ends") return "phase";
  return draw;
}

function OutlinedPolyline({
  positions,
  color,
  weight,
  dashed,
  className,
  eventHandlers,
  interactive,
}: {
  positions: LatLng[];
  color: string;
  weight: number;
  dashed?: string;
  className?: string;
  eventHandlers?: L.LeafletEventHandlerFnMap;
  interactive?: boolean;
}) {
  const join = { lineJoin: "round" as const, lineCap: "round" as const, fillOpacity: 0 };
  return (
    <>
      <SafePolyline
        positions={positions}
        pathOptions={{
          color: CM_HALO,
          weight: weight + 4,
          dashArray: dashed,
          ...join,
        }}
        interactive={false}
      />
      <SafePolyline
        positions={positions}
        pathOptions={{
          color,
          weight,
          dashArray: dashed,
          className,
          ...join,
        }}
        eventHandlers={eventHandlers}
        interactive={interactive}
      />
    </>
  );
}

export function CmLineLayer({
  graphic,
  selected,
  editing,
  onSelect,
  onBeginMove,
}: {
  graphic: Graphic;
  selected: boolean;
  editing: boolean;
  onSelect: (id: string) => void;
  onBeginMove: (ll: LatLng) => void;
}) {
  const symbol = graphic.symbol;
  const def = symbol ? findControlMeasure(symbol.entity) : undefined;
  const identity = symbol?.identity ?? "03";
  const color = cmStrokeColor(identity, selected);
  const planned = symbol?.status === "1";
  const caption = symbol ? cmLineCaption(def, symbol) : graphic.name;
  const dtg = symbol?.dtg?.trim() ?? "";
  const labelText = dtg ? `${caption}\n${dtg}` : caption;
  const draw = resolveDraw(def?.lineDraw);
  const dashed =
    planned || draw === "light" || draw === "arrow-dashed" ? "10 6" : undefined;
  const map = useMap();
  const [viewTick, setViewTick] = useState(0);
  useMapEvents({
    zoomend() {
      setViewTick((n) => n + 1);
    },
  });

  const handlers = {
    click: (e: L.LeafletMouseEvent) => {
      L.DomEvent.stop(e.originalEvent);
      onSelect(graphic.id);
    },
    mousedown: (e: L.LeafletMouseEvent) => {
      if (!editing) return;
      L.DomEvent.stop(e.originalEvent);
      L.DomEvent.preventDefault(e.originalEvent);
      onBeginMove([e.latlng.lat, e.latlng.lng]);
    },
  };

  const built = useMemo(() => {
    const pts = isLinearTarget(symbol?.entity)
      ? (linearTargetShaft(graphic) ?? [])
      : cleanLatLngs(graphic.positions);
    if (pts.length < 2) {
      return {
        shafts: [] as LatLng[][],
        ticks: [] as LatLng[][],
        bumps: [] as LatLng[][],
        heads: [] as LatLng[][],
        labels: [] as {
          at: LatLng;
          bearing: number | null;
          text: string;
          kind: "text" | "echelon";
          bare?: boolean;
          align?: LabelAlign;
        }[],
      };
    }
    const scale = decorationScale(pts);
    const ends = terminalBearings(pts);
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    let shafts: LatLng[][] = [pts];
    const ticks: LatLng[][] = [];
    const bumps: LatLng[][] = [];
    const heads: LatLng[][] = [];
    const labels: {
      at: LatLng;
      bearing: number | null;
      text: string;
      kind: "text" | "echelon";
      bare?: boolean;
      align?: LabelAlign;
    }[] = [];
    const endLabel = (at: LatLng, bearing: number) => {
      if (labelText)
        labels.push({
          at,
          bearing,
          text: labelText.replace("\n", " · "),
          kind: "text",
        });
    };

    const phaseCaps = () => {
      if (!ends) return;
      ticks.push(tCapPixel(map, first, ends.start, 10));
      ticks.push(tCapPixel(map, last, ends.end, 10));
    };

    const phaseEndLabels = (text: string) => {
      if (!text || !ends) return;
      labels.push(
        { at: first, bearing: null, text, kind: "text", bare: true },
        { at: last, bearing: null, text, kind: "text", bare: true },
      );
    };

    const phaseLineEndLabels = (text: string) => {
      if (!text) return;
      try {
        const a = map.latLngToLayerPoint(L.latLng(first[0], first[1]));
        const b = map.latLngToLayerPoint(L.latLng(last[0], last[1]));
        const layout = phaseEndLabelLayout(a, b, 10);
        labels.push(
          {
            at: screenOffset(map, first, layout.start.dx, layout.start.dy),
            bearing: null,
            text,
            kind: "text",
            bare: true,
            align: layout.start.align,
          },
          {
            at: screenOffset(map, last, layout.end.dx, layout.end.dy),
            bearing: null,
            text,
            kind: "text",
            bare: true,
            align: layout.end.align,
          },
        );
      } catch {
        phaseEndLabels(text);
      }
    };

    if (draw === "boundary") {
      const t1 = symbol?.uniqueDesignation?.trim() ?? "";
      const t2 = symbol?.uniqueDesignation2?.trim() ?? "";
      const b = echelonMark(symbol?.fieldB);
      const mid = pointAlongPath(pts, 0.5);
      if (mid) {
        const px = viewTick >= 0 ? 31 : 31;
        const axis = boundaryLabelAxis(mid.bearing);
        const t1At =
          axis === "ns"
            ? screenOffset(map, mid.at, 0, -px)
            : screenOffset(map, mid.at, -px, 0);
        const t2At =
          axis === "ns"
            ? screenOffset(map, mid.at, 0, px)
            : screenOffset(map, mid.at, px, 0);
        if (b) {
          labels.push({
            at: mid.at,
            bearing: mid.bearing,
            text: b,
            kind: "echelon",
          });
        }
        if (t1) {
          labels.push({ at: t1At, bearing: null, text: t1, kind: "text", bare: true });
        }
        if (t2) {
          labels.push({ at: t2At, bearing: null, text: t2, kind: "text", bare: true });
        }
        if (identity === "06") {
          labels.push({
            at: screenOffset(map, mid.at, 0, axis === "ns" ? px * 2 : 0),
            bearing: null,
            text: "ENY",
            kind: "text",
            bare: true,
          });
        }
      }
    } else if (draw === "flot") {
      let scallops: LatLng[] = [];
      try {
        scallops = flotScallopsPx(map, pts, 10);
      } catch {
        scallops = [];
      }
      if (scallops.length >= 2) {
        shafts = [];
        bumps.push(scallops);
      }
      phaseEndLabels(symbol?.uniqueDesignation?.trim() ?? "");
    } else if (draw === "phase") {
      phaseLineEndLabels(
        phaseEndCaption(def?.abbrev ?? "", symbol?.uniqueDesignation),
      );
    } else if (draw === "ibeam") {
      phaseCaps();
      const mid = pointAlongPath(pts, 0.5);
      const kind = isLinearTarget(symbol?.entity)
        ? linearTargetKind(symbol?.entity)
        : undefined;
      const ap = symbol?.targetNumber?.trim() ?? "";
      const unit = symbol?.uniqueDesignation?.trim() ?? "";
      const sys = fireSystemMark(symbol?.equipmentType);
      const typeMark = kind?.mark ?? "";
      if (mid) {
        try {
          const above = 16;
          const below = typeMark ? 26 : 14;
          if (ap) {
            labels.push({
              at: offsetPerpScreen(map, mid.at, mid.bearing, above, "above"),
              bearing: null,
              text: ap,
              kind: "text",
              bare: true,
            });
          }
          if (typeMark) {
            labels.push({
              at: offsetPerpScreen(map, mid.at, mid.bearing, 12, "below"),
              bearing: null,
              text: typeMark,
              kind: "text",
              bare: true,
            });
          }
          if (unit) {
            labels.push({
              at: offsetPerpScreen(map, mid.at, mid.bearing, below, "below"),
              bearing: null,
              text: unit,
              kind: "text",
              bare: true,
            });
          }
          if (sys) {
            labels.push({
              at: offsetPerpScreen(
                map,
                mid.at,
                mid.bearing,
                below + (unit ? 14 : 0),
                "below",
              ),
              bearing: null,
              text: sys,
              kind: "text",
              bare: true,
            });
          }
        } catch {
          if (ap) {
            labels.push({
              at: mid.at,
              bearing: null,
              text: ap,
              kind: "text",
              bare: true,
            });
          }
        }
      }
    } else if (draw === "light") {
      phaseCaps();
      phaseEndLabels(
        phaseEndCaption(def?.abbrev ?? "", symbol?.uniqueDesignation),
      );
    } else if (
      draw === "arrow" ||
      draw === "arrow-double" ||
      draw === "arrow-dashed"
    ) {
      if (ends) {
        heads.push(
          arrowHead(last, ends.end, scale.arrowLen, scale.arrowW),
        );
        if (draw === "arrow-double") {
          shafts = [
            offsetPolyline(pts, scale.tickM * 0.35),
            offsetPolyline(pts, -scale.tickM * 0.35),
          ];
        }
        endLabel(first, ends.start);
      }
    } else if (labelText) {
      const midI = Math.floor((pts.length - 1) / 2);
      const a = pts[midI]!;
      const b = pts[midI + 1] ?? a;
      labels.push({
        at: a,
        bearing: terminalBearings([a, b])?.end ?? 90,
        text: labelText.replace("\n", " · "),
        kind: "text",
      });
    }

    return { shafts, ticks, bumps, heads, labels };
  }, [
    graphic.positions,
    graphic.lengthM,
    graphic.headingDeg,
    draw,
    labelText,
    identity,
    symbol?.uniqueDesignation,
    symbol?.uniqueDesignation2,
    symbol?.fieldB,
    symbol?.targetNumber,
    symbol?.equipmentType,
    symbol?.entity,
    def?.abbrev,
    map,
    viewTick,
  ]);

  const weight = selected ? 4 : draw === "boundary" ? 2 : 3;

  return (
    <>
      {built.shafts.map((path, i) => (
        <OutlinedPolyline
          key={`${graphic.id}-s${i}`}
          positions={path}
          color={color}
          weight={weight}
          dashed={dashed}
          className={editing ? "mgb-shape-editable" : undefined}
          eventHandlers={i === 0 ? handlers : undefined}
        />
      ))}
      {built.ticks.map((path, i) => (
        <OutlinedPolyline
          key={`${graphic.id}-t${i}`}
          positions={path}
          color={color}
          weight={weight}
          dashed={dashed}
          interactive={false}
        />
      ))}
      {built.bumps.map((path, i) => (
        <OutlinedPolyline
          key={`${graphic.id}-b${i}`}
          positions={path}
          color={color}
          weight={weight}
          className={editing ? "mgb-shape-editable" : undefined}
          eventHandlers={built.shafts.length === 0 ? handlers : undefined}
          interactive={built.shafts.length === 0}
        />
      ))}
      {built.heads.map((path, i) => (
        <Fragment key={`${graphic.id}-h${i}`}>
          <SafePolygon
            positions={path}
            pathOptions={{
              color: CM_HALO,
              weight: 5,
              fillColor: CM_HALO,
              fillOpacity: draw === "arrow-dashed" ? 0 : 1,
              dashArray: dashed,
            }}
            interactive={false}
          />
          <SafePolygon
            positions={path}
            pathOptions={{
              color,
              weight: 1,
              fillColor: color,
              fillOpacity: draw === "arrow-dashed" ? 0 : 1,
              dashArray: dashed,
            }}
            interactive={false}
          />
        </Fragment>
      ))}
      {built.labels.map((lbl, i) =>
        isFiniteLatLng(lbl.at) ? (
          <Marker
            key={`${graphic.id}-lbl-${i}`}
            position={lbl.at}
            icon={
              lbl.kind === "echelon"
                ? echelonIcon(lbl.text, color, lbl.bearing ?? 0)
                : labelIcon(
                  lbl.text,
                  color,
                  lbl.bearing,
                  !lbl.bare,
                  lbl.align ?? "center",
                )
            }
            zIndexOffset={lbl.kind === "echelon" ? 750 : 700}
            interactive={false}
          />
        ) : null,
      )}
    </>
  );
}
