import { Marker } from "react-leaflet";
import L from "leaflet";
import { findControlMeasure } from "@/catalogs/controlMeasurePoints";
import { SafeCircle, SafePolygon } from "@/components/SafePath";
import { CM_HALO, cmStrokeColor } from "@/lib/cmLine";
import {
  areaCentroid,
  cmAreaLabelLines,
  isCmCircleArea,
} from "@/lib/cmArea";
import { isFiniteLatLng } from "@/lib/latlng";
import type { Graphic, LatLng } from "@/types/graphic";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function areaLabelIcon(lines: string[], color: string): L.DivIcon {
  const w = Math.max(48, ...lines.map((t) => t.length * 8 + 8));
  const h = Math.max(22, lines.length * 14 + 6);
  const body = lines
    .map((t) => `<span>${escapeHtml(t)}</span>`)
    .join("");
  return L.divIcon({
    className: "cm-line-label",
    html: `<span class="cm-line-label-text cm-line-label-bare cm-area-label" style="color:${color}">${body}</span>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
}

export function CmAreaLayer({
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
  const color = cmStrokeColor(symbol?.identity ?? "03", selected);
  const planned = symbol?.status === "1" || graphic.dash === "dashed";
  const dashed = planned ? "10 6" : undefined;
  const weight = selected ? 3 : 2;
  const lines = cmAreaLabelLines(def, symbol);
  const labelAt = isCmCircleArea(graphic)
    ? (graphic.positions[0] ?? null)
    : areaCentroid(graphic.positions);

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

  const stroke = {
    lineJoin: "round" as const,
    lineCap: "round" as const,
    dashArray: dashed,
    fill: true,
    fillOpacity: 0.04,
  };

  return (
    <>
      {isCmCircleArea(graphic) && isFiniteLatLng(graphic.positions[0]) ? (
        <>
          <SafeCircle
            center={graphic.positions[0]}
            radius={graphic.radiusM ?? 500}
            pathOptions={{
              color: CM_HALO,
              weight: weight + 4,
              fillColor: CM_HALO,
              ...stroke,
              fillOpacity: 0,
            }}
            interactive={false}
          />
          <SafeCircle
            center={graphic.positions[0]}
            radius={graphic.radiusM ?? 500}
            pathOptions={{
              color,
              weight,
              fillColor: color,
              className: editing ? "mgb-shape-editable" : undefined,
              ...stroke,
            }}
            eventHandlers={handlers}
          />
        </>
      ) : (
        <>
          <SafePolygon
            positions={graphic.positions}
            pathOptions={{
              color: CM_HALO,
              weight: weight + 4,
              fillColor: CM_HALO,
              ...stroke,
              fillOpacity: 0,
            }}
            interactive={false}
          />
          <SafePolygon
            positions={graphic.positions}
            pathOptions={{
              color,
              weight,
              fillColor: color,
              className: editing ? "mgb-shape-editable" : undefined,
              ...stroke,
            }}
            eventHandlers={handlers}
          />
        </>
      )}
      {labelAt && isFiniteLatLng(labelAt) && lines.length > 0 ? (
        <Marker
          position={labelAt}
          icon={areaLabelIcon(lines, color)}
          zIndexOffset={700}
          interactive={false}
        />
      ) : null}
    </>
  );
}
