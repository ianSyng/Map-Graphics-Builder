import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";
import { SafePolyline } from "@/components/SafePath";
import { isFiniteLatLng } from "@/lib/latlng";
import { midpoint, offsetEast } from "@/lib/geo";
import { minVertices } from "@/lib/geometryEdit";
import { bearingDeg } from "@/lib/geodesy";
import { isCmLinePointGraphic } from "@/lib/cmLine";
import { rectFromGraphic, rotationHandle } from "@/lib/rectangle";
import type { Graphic, LatLng } from "@/types/graphic";

function handleIcon(
  kind: "vertex" | "vertex-active" | "mid" | "radius" | "rotate",
): L.DivIcon {
  const cls =
    kind === "mid"
      ? "mgb-handle mgb-handle-mid"
      : kind === "radius"
        ? "mgb-handle mgb-handle-radius"
        : kind === "rotate"
          ? "mgb-handle mgb-handle-rotate"
          : kind === "vertex-active"
            ? "mgb-handle mgb-handle-vertex is-active"
            : "mgb-handle mgb-handle-vertex";
  const size = kind === "mid" ? 9 : kind === "radius" || kind === "rotate" ? 12 : 11;
  return L.divIcon({
    className: cls,
    html: "<span></span>",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ICONS = {
  vertex: handleIcon("vertex"),
  vertexActive: handleIcon("vertex-active"),
  mid: handleIcon("mid"),
  radius: handleIcon("radius"),
  rotate: handleIcon("rotate"),
};

function DraggableHandle({
  position,
  icon,
  title,
  onMove,
  onClick,
  onDelete,
  liveMove = true,
}: {
  position: LatLng;
  icon: L.DivIcon;
  title: string;
  onMove: (ll: LatLng) => void;
  onClick?: () => void;
  onDelete?: () => void;
  /** When false, parent is updated only on drop (midpoint insert). */
  liveMove?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [frozen, setFrozen] = useState<LatLng>(position);
  const dragged = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const rafRef = useRef(0);
  const pendingRef = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!dragging) setFrozen(position);
  }, [position, dragging]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const queueMove = (ll: LatLng) => {
    pendingRef.current = ll;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const p = pendingRef.current;
      if (p) onMoveRef.current(p);
    });
  };

  return (
    <Marker
      position={dragging ? frozen : position}
      icon={icon}
      draggable
      autoPan={false}
      zIndexOffset={1200}
      title={title}
      eventHandlers={{
        mousedown: (e) => {
          dragged.current = false;
          L.DomEvent.stop(e.originalEvent);
        },
        click: (e) => {
          L.DomEvent.stop(e.originalEvent);
          if (dragged.current) return;
          onClick?.();
        },
        dblclick: (e) => {
          L.DomEvent.stop(e.originalEvent);
          L.DomEvent.preventDefault(e.originalEvent);
          onDelete?.();
        },
        dragstart: () => {
          dragged.current = true;
          setFrozen(position);
          setDragging(true);
        },
        drag: (e) => {
          const ll = e.target.getLatLng();
          const next: LatLng = [ll.lat, ll.lng];
          if (liveMove) queueMove(next);
        },
        dragend: (e) => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          const ll = e.target.getLatLng();
          onMoveRef.current([ll.lat, ll.lng]);
          setDragging(false);
        },
      }}
    />
  );
}

export function EditHandles({
  graphic,
  selectedVertexIndex,
  onMoveVertex,
  onInsertVertex,
  onRemoveVertex,
  onSelectVertex,
  onRadius,
  onHeading,
}: {
  graphic: Graphic;
  selectedVertexIndex: number | null;
  onMoveVertex: (index: number, ll: LatLng) => void;
  onInsertVertex: (index: number, ll: LatLng) => void;
  onRemoveVertex: (index: number) => void;
  onSelectVertex: (index: number) => void;
  onRadius: (radiusM: number) => void;
  onHeading: (headingDeg: number) => void;
}) {
  if (graphic.kind === "point" && graphic.symbol) return null;
  if (isCmLinePointGraphic(graphic)) return null;

  if (graphic.kind === "point" && isFiniteLatLng(graphic.positions[0])) {
    return (
      <DraggableHandle
        position={graphic.positions[0]}
        icon={ICONS.vertexActive}
        title="Drag to move"
        onMove={(ll) => onMoveVertex(0, ll)}
        onClick={() => onSelectVertex(0)}
      />
    );
  }

  if (graphic.kind === "circle" && isFiniteLatLng(graphic.positions[0])) {
    const center = graphic.positions[0];
    const radiusM = graphic.radiusM ?? 500;
    const rim = offsetEast(center, radiusM);
    return (
      <>
        <DraggableHandle
          position={center}
          icon={ICONS.vertexActive}
          title="Drag to move center"
          onMove={(ll) => onMoveVertex(0, ll)}
          onClick={() => onSelectVertex(0)}
        />
        <DraggableHandle
          position={rim}
          icon={ICONS.radius}
          title="Drag to resize"
          onMove={(ll) => {
            const m = L.latLng(center[0], center[1]).distanceTo(
              L.latLng(ll[0], ll[1]),
            );
            onRadius(m);
          }}
        />
      </>
    );
  }

  if (graphic.kind === "rectangle") {
    const model = rectFromGraphic(graphic);
    if (!model) return null;
    const handle = rotationHandle(model);
    return (
      <>
        <SafePolyline
          positions={[model.center, handle]}
          pathOptions={{ color: "#38bdf8", weight: 1, dashArray: "4 3" }}
        />
        {graphic.positions.map((pt, i) =>
          isFiniteLatLng(pt) ? (
            <DraggableHandle
              key={`v-${graphic.id}-${i}`}
              position={pt}
              icon={selectedVertexIndex === i ? ICONS.vertexActive : ICONS.vertex}
              title="Drag to resize · rectangle stays rectangular"
              onMove={(ll) => onMoveVertex(i, ll)}
              onClick={() => onSelectVertex(i)}
            />
          ) : null,
        )}
        <DraggableHandle
          position={handle}
          icon={ICONS.rotate}
          title="Drag to change attitude"
          onMove={(ll) => onHeading(bearingDeg(model.center, ll))}
        />
      </>
    );
  }

  if (graphic.kind !== "line" && graphic.kind !== "polygon") return null;

  const pts = graphic.positions;
  const canDelete = pts.length > minVertices(graphic.kind);
  const midCount = graphic.kind === "polygon" ? pts.length : pts.length - 1;

  return (
    <>
      {pts.map((pt, i) =>
        isFiniteLatLng(pt) ? (
          <DraggableHandle
            key={`v-${graphic.id}-${i}`}
            position={pt}
            icon={selectedVertexIndex === i ? ICONS.vertexActive : ICONS.vertex}
            title={
              canDelete
                ? "Drag to move · double-click to delete"
                : "Drag to move"
            }
            onMove={(ll) => onMoveVertex(i, ll)}
            onClick={() => onSelectVertex(i)}
            onDelete={canDelete ? () => onRemoveVertex(i) : undefined}
          />
        ) : null,
      )}
      {Array.from({ length: Math.max(0, midCount) }, (_, i) => {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (!isFiniteLatLng(a) || !isFiniteLatLng(b)) return null;
        const insertAt = i + 1;
        return (
          <DraggableHandle
            key={`m-${graphic.id}-${i}-${pts.length}`}
            position={midpoint(a, b)}
            icon={ICONS.mid}
            title="Drag or click to add a vertex"
            liveMove={false}
            onMove={(ll) => onInsertVertex(insertAt, ll)}
            onClick={() => onInsertVertex(insertAt, midpoint(a, b))}
          />
        );
      })}
    </>
  );
}
