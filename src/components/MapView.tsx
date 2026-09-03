import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { EditHandles } from "@/components/EditHandles";
import { CmAreaLayer } from "@/components/CmAreaLayer";
import { CmLineLayer } from "@/components/CmLineLayer";
import { CmLineMarker } from "@/components/CmLineMarker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SafeCircle, SafePolygon, SafePolyline } from "@/components/SafePath";
import { SymbolMarker } from "@/components/SymbolMarker";
import { idsIntersectingBox } from "@/lib/eraseHit";
import { bearingDeg } from "@/lib/geodesy";
import { cleanLatLngs, isFiniteLatLng, polylinePath } from "@/lib/latlng";
import { isCmAreaGraphic } from "@/lib/cmArea";
import { CM_HALO, CM_INK, isCmLinePointGraphic } from "@/lib/cmLine";
import { distanceM } from "@/lib/geo";
import { makeLinearTargetIcon } from "@/lib/linearTargetIcon";
import { makeSymbol } from "@/domain/sidc";
import {
  cornersFromRect,
  midpoint,
  rectFromDrag,
  rotationHandle,
} from "@/lib/rectangle";
import type { DrawTool, Graphic, LatLng } from "@/types/graphic";

const markerIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:12px;height:12px;border-radius:999px;background:#38bdf8;border:2px solid #e0f2fe;box-shadow:0 0 0 1px #0f172a"></span>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function dashArray(dash: Graphic["dash"]): string | undefined {
  return dash === "dashed" ? "8 6" : undefined;
}

function MapClickHandler({
  tool,
  draft,
  onMapClick,
  onFinish,
  onDeselect,
  ignoreNextClick,
  allowDoubleClickZoom,
  onHover,
  onRectangleHeading,
  onHeadingDelta,
  captureWheel,
}: {
  tool: DrawTool;
  draft: LatLng[];
  onMapClick: (ll: LatLng) => void;
  onFinish: () => void;
  onDeselect: () => void;
  ignoreNextClick: MutableRefObject<boolean>;
  allowDoubleClickZoom: boolean;
  onHover: (ll: LatLng | null) => void;
  onRectangleHeading: (deg: number) => void;
  onHeadingDelta: (deg: number) => void;
  captureWheel: boolean;
}) {
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onRectHeadingRef = useRef(onRectangleHeading);
  onRectHeadingRef.current = onRectangleHeading;

  useMapEvents({
    click(e) {
      if (ignoreNextClick.current) {
        ignoreNextClick.current = false;
        return;
      }
      if (tool === "select") {
        onDeselect();
        return;
      }
      if (tool === "erase") return;
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
    dblclick(e) {
      if (
        tool === "line" ||
        tool === "cm-line" ||
        tool === "polygon" ||
        tool === "cm-area" ||
        tool === "rectangle"
      ) {
        L.DomEvent.stop(e.originalEvent);
        onFinish();
      }
    },
    mousemove(e) {
      const t = toolRef.current;
      if (
        t === "select" ||
        t === "erase" ||
        t === "point" ||
        t === "cm-point"
      ) {
        return;
      }
      const ll: LatLng = [e.latlng.lat, e.latlng.lng];
      onHoverRef.current(ll);
      const d = draftRef.current;
      if (t === "rectangle" && d.length >= 2 && d[0] && d[1]) {
        onRectHeadingRef.current(bearingDeg(midpoint(d[0], d[1]), ll));
      }
    },
    mouseout() {
      onHoverRef.current(null);
    },
  });

  const map = useMap();
  useEffect(() => {
    if (allowDoubleClickZoom) map.doubleClickZoom.enable();
    else map.doubleClickZoom.disable();
    return () => {
      map.doubleClickZoom.enable();
    };
  }, [map, allowDoubleClickZoom]);

  const onHeadingDeltaRef = useRef(onHeadingDelta);
  onHeadingDeltaRef.current = onHeadingDelta;

  useEffect(() => {
    if (captureWheel) map.scrollWheelZoom.disable();
    else map.scrollWheelZoom.enable();
    const el = map.getContainer();
    const onWheel = (e: WheelEvent) => {
      if (!captureWheel) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 15 : 5;
      onHeadingDeltaRef.current(e.deltaY > 0 ? step : -step);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      map.scrollWheelZoom.enable();
    };
  }, [map, captureWheel]);

  return null;
}

function ShapeDragController({
  beginRef,
  onDelta,
  ignoreNextClick,
}: {
  beginRef: MutableRefObject<(ll: LatLng) => void>;
  onDelta: (dLat: number, dLng: number) => void;
  ignoreNextClick: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const lastRef = useRef<LatLng | null>(null);
  const onDeltaRef = useRef(onDelta);
  onDeltaRef.current = onDelta;

  beginRef.current = (ll) => {
    lastRef.current = ll;
    ignoreNextClick.current = true;
    map.dragging.disable();
  };

  const accRef = useRef({ dLat: 0, dLng: 0 });
  const rafRef = useRef(0);

  const handlers = useMemo(
    () => ({
      mousemove(e: L.LeafletMouseEvent) {
        const last = lastRef.current;
        if (!last) return;
        const next: LatLng = [e.latlng.lat, e.latlng.lng];
        accRef.current.dLat += next[0] - last[0];
        accRef.current.dLng += next[1] - last[1];
        lastRef.current = next;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const { dLat, dLng } = accRef.current;
          accRef.current = { dLat: 0, dLng: 0 };
          if (dLat !== 0 || dLng !== 0) onDeltaRef.current(dLat, dLng);
        });
      },
      mouseup() {
        if (!lastRef.current) return;
        lastRef.current = null;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
          const { dLat, dLng } = accRef.current;
          accRef.current = { dLat: 0, dLng: 0 };
          if (dLat !== 0 || dLng !== 0) onDeltaRef.current(dLat, dLng);
        }
        map.dragging.enable();
        ignoreNextClick.current = true;
        window.setTimeout(() => {
          ignoreNextClick.current = false;
        }, 50);
      },
    }),
    [map, ignoreNextClick],
  );

  useMapEvents(handlers);

  return null;
}

function EraseBoxController({
  enabled,
  graphics,
  onEraseIds,
  ignoreNextClick,
}: {
  enabled: boolean;
  graphics: Graphic[];
  onEraseIds: (ids: string[]) => void;
  ignoreNextClick: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const startRef = useRef<LatLng | null>(null);
  const graphicsRef = useRef(graphics);
  graphicsRef.current = graphics;
  const [box, setBox] = useState<[LatLng, LatLng] | null>(null);

  useEffect(() => {
    if (!enabled) {
      startRef.current = null;
      setBox(null);
      map.dragging.enable();
    }
  }, [enabled, map]);

  useMapEvents({
    mousedown(e) {
      if (!enabled) return;
      if (e.originalEvent.button !== 0) return;
      startRef.current = [e.latlng.lat, e.latlng.lng];
      setBox(null);
      map.dragging.disable();
    },
    mousemove(e) {
      if (!enabled || !startRef.current) return;
      setBox([startRef.current, [e.latlng.lat, e.latlng.lng]]);
    },
    mouseup(e) {
      if (!enabled || !startRef.current) return;
      const a = startRef.current;
      const b: LatLng = [e.latlng.lat, e.latlng.lng];
      startRef.current = null;
      map.dragging.enable();
      setBox(null);
      const px = map
        .latLngToContainerPoint(a)
        .distanceTo(map.latLngToContainerPoint(b));
      if (px < 8) return;
      ignoreNextClick.current = true;
      window.setTimeout(() => {
        ignoreNextClick.current = false;
      }, 50);
      const ids = idsIntersectingBox(graphicsRef.current, a, b);
      if (ids.length) onEraseIds(ids);
    },
  });

  if (!enabled || !box) return null;
  const bounds = L.latLngBounds(box[0], box[1]);
  if (!bounds.isValid()) return null;
  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: "#f87171",
        weight: 1,
        dashArray: "6 4",
        fillColor: "#f87171",
        fillOpacity: 0.12,
        interactive: false,
      }}
    />
  );
}

function GraphicShape({
  graphic,
  selected,
  editing,
  onSelect,
  onBeginMove,
  onMoveVertex,
}: {
  graphic: Graphic;
  selected: boolean;
  editing: boolean;
  onSelect: (id: string) => void;
  onBeginMove: (ll: LatLng) => void;
  onMoveVertex: (id: string, index: number, ll: LatLng) => void;
}) {
  const path = {
    color: selected ? "#fbbf24" : graphic.color,
    weight: selected ? graphic.weight + 1 : graphic.weight,
    dashArray: dashArray(graphic.dash),
    fillColor: graphic.color,
    fillOpacity: graphic.kind === "line" ? 0 : graphic.fillOpacity,
    className: editing ? "mgb-shape-editable" : undefined,
    bubblingMouseEvents: true,
  };

  const selectHandlers = {
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

  if (
    isCmLinePointGraphic(graphic) &&
    isFiniteLatLng(graphic.positions[0])
  ) {
    return (
      <CmLineMarker
        graphic={graphic}
        selected={selected}
        editing={editing}
        onSelect={() => onSelect(graphic.id)}
        onMove={(ll) => onMoveVertex(graphic.id, 0, ll)}
      />
    );
  }

  if (graphic.kind === "point" && isFiniteLatLng(graphic.positions[0])) {
    const [lat, lng] = graphic.positions[0];
    if (graphic.symbol) {
      return (
        <SymbolMarker
          position={[lat, lng]}
          symbol={graphic.symbol}
          selected={selected}
          draggable={editing}
          onSelect={() => onSelect(graphic.id)}
          onMove={(ll) => onMoveVertex(graphic.id, 0, ll)}
        />
      );
    }
    if (editing) return null;
    return (
      <Marker
        position={[lat, lng]}
        icon={markerIcon}
        eventHandlers={{
          click: (e) => {
            L.DomEvent.stop(e.originalEvent);
            onSelect(graphic.id);
          },
        }}
      />
    );
  }

  if (isCmAreaGraphic(graphic)) {
    return (
      <CmAreaLayer
        graphic={graphic}
        selected={selected}
        editing={editing}
        onSelect={onSelect}
        onBeginMove={onBeginMove}
      />
    );
  }

  if (graphic.kind === "circle" && isFiniteLatLng(graphic.positions[0])) {
    const [lat, lng] = graphic.positions[0];
    return (
      <Circle
        center={[lat, lng]}
        radius={graphic.radiusM ?? 500}
        pathOptions={path}
        eventHandlers={selectHandlers}
      />
    );
  }

  if (graphic.kind === "line" && graphic.positions.length >= 2) {
    if (graphic.symbol) {
      return (
        <CmLineLayer
          graphic={graphic}
          selected={selected}
          editing={editing}
          onSelect={onSelect}
          onBeginMove={onBeginMove}
        />
      );
    }
    return (
      <SafePolyline
        positions={graphic.positions}
        pathOptions={path}
        eventHandlers={selectHandlers}
      />
    );
  }

  if (
    (graphic.kind === "polygon" && graphic.positions.length >= 3) ||
    (graphic.kind === "rectangle" && graphic.positions.length >= 4)
  ) {
    return (
      <SafePolygon
        positions={graphic.positions}
        pathOptions={path}
        eventHandlers={selectHandlers}
      />
    );
  }

  return null;
}

function DraftShape({
  tool,
  draft,
  hover,
  headingDeg,
  linearTargetPreview,
  cmAreaDraw,
}: {
  tool: DrawTool;
  draft: LatLng[];
  hover: LatLng | null;
  headingDeg: number;
  linearTargetPreview: {
    headingDeg: number;
    entity: string;
    identity: string;
    status: string;
  } | null;
  cmAreaDraw: "circle" | "polygon" | null;
}) {
  if (
    linearTargetPreview &&
    tool === "cm-line" &&
    draft.length === 0 &&
    isFiniteLatLng(hover)
  ) {
    return (
      <Marker
        position={hover}
        icon={makeLinearTargetIcon(
          {
            headingDeg: linearTargetPreview.headingDeg,
            symbol: makeSymbol({
              standard: "2525D",
              entity: linearTargetPreview.entity,
              identity: linearTargetPreview.identity,
              status: linearTargetPreview.status,
            }),
          },
          CM_INK,
          false,
        )}
        interactive={false}
      />
    );
  }
  if (draft.length === 0) return null;
  const path = {
    color: "#38bdf8",
    weight: 2,
    dashArray: "4 4",
    fillOpacity: 0.12,
  };
  if (tool === "rectangle" && isFiniteLatLng(draft[0])) {
    const opposite = draft[1] ?? hover ?? draft[0];
    if (!isFiniteLatLng(opposite)) return null;
    const heading = draft[1] ? headingDeg : 0;
    const rect = rectFromDrag(draft[0], opposite, heading);
    const corners = cornersFromRect(rect);
    const tip = rotationHandle(rect);
    return (
      <>
        <SafePolygon positions={corners} pathOptions={path} />
        <SafePolyline
          positions={[rect.center, tip]}
          pathOptions={{ color: "#38bdf8", weight: 1, dashArray: "4 3" }}
        />
        <Marker position={draft[0]} icon={markerIcon} />
      </>
    );
  }
  if (tool === "cm-line") {
    const pts = polylinePath(hover ? [...draft, hover] : draft);
    if (pts) {
      const join = {
        lineJoin: "round" as const,
        lineCap: "round" as const,
        fillOpacity: 0,
        dashArray: "4 4",
      };
      return (
        <>
          <SafePolyline
            positions={pts}
            pathOptions={{ color: CM_HALO, weight: 7, ...join }}
            interactive={false}
          />
          <SafePolyline
            positions={pts}
            pathOptions={{ color: CM_INK, weight: 3, ...join }}
            interactive={false}
          />
        </>
      );
    }
    if (isFiniteLatLng(draft[0])) {
      return <Marker position={draft[0]} icon={markerIcon} />;
    }
    return null;
  }
  if (tool === "line") {
    const pts = polylinePath(hover ? [...draft, hover] : draft);
    if (pts) return <SafePolyline positions={pts} pathOptions={path} />;
    if (isFiniteLatLng(draft[0])) {
      return <Marker position={draft[0]} icon={markerIcon} />;
    }
  }
  if (tool === "cm-area" && cmAreaDraw === "polygon") {
    const pts = polylinePath(hover ? [...draft, hover] : draft);
    if (pts) {
      const join = {
        lineJoin: "round" as const,
        lineCap: "round" as const,
        fillOpacity: 0.06,
        dashArray: "4 4",
      };
      return (
        <>
          <SafePolygon
            positions={pts}
            pathOptions={{ color: CM_HALO, weight: 7, fillColor: CM_HALO, ...join, fillOpacity: 0 }}
            interactive={false}
          />
          <SafePolygon
            positions={pts}
            pathOptions={{ color: CM_INK, weight: 3, fillColor: CM_INK, ...join }}
            interactive={false}
          />
        </>
      );
    }
    if (isFiniteLatLng(draft[0])) {
      return <Marker position={draft[0]} icon={markerIcon} />;
    }
  }
  if (
    (tool === "circle" || (tool === "cm-area" && cmAreaDraw === "circle")) &&
    isFiniteLatLng(draft[0])
  ) {
    const r = hover ? distanceM(draft[0], hover) : 0;
    const outlined =
      r > 1 ? (
        <>
          <SafeCircle
            center={draft[0]}
            radius={r}
            pathOptions={{
              color: tool === "cm-area" ? CM_HALO : "#38bdf8",
              weight: tool === "cm-area" ? 7 : 2,
              dashArray: "4 4",
              fillOpacity: 0,
            }}
            interactive={false}
          />
          {tool === "cm-area" ? (
            <SafeCircle
              center={draft[0]}
              radius={r}
              pathOptions={{
                color: CM_INK,
                weight: 3,
                dashArray: "4 4",
                fillColor: CM_INK,
                fillOpacity: 0.06,
              }}
              interactive={false}
            />
          ) : null}
        </>
      ) : null;
    return (
      <>
        {outlined}
        <Marker position={draft[0]} icon={markerIcon} />
      </>
    );
  }
  if (
    (tool === "point" || tool === "polygon") &&
    isFiniteLatLng(draft[0])
  ) {
    return <Marker position={draft[0]} icon={markerIcon} />;
  }
  return null;
}

export interface FitRequest {
  nonce: number;
  graphics: Graphic[];
}

function FitImported({ request }: { request: FitRequest | null }) {
  const map = useMap();
  useEffect(() => {
    if (!request || request.graphics.length === 0) return;
    const points: L.LatLng[] = [];
    const boxes: L.LatLngBounds[] = [];
    for (const g of request.graphics) {
      if (g.kind === "circle" && isFiniteLatLng(g.positions[0])) {
        const center = L.latLng(g.positions[0][0], g.positions[0][1]);
        boxes.push(center.toBounds((g.radiusM ?? 500) * 2));
        continue;
      }
      const pts = cleanLatLngs(g.positions);
      for (const p of pts) {
        points.push(L.latLng(p[0], p[1]));
      }
    }
    const seed = boxes[0] ?? (points[0] ? L.latLngBounds(points[0], points[0]) : null);
    if (!seed) return;
    for (const box of boxes) seed.extend(box);
    for (const pt of points) seed.extend(pt);
    if (!seed.isValid()) return;
    map.fitBounds(seed, { padding: [48, 48], maxZoom: 14, animate: true });
  }, [request, map]);
  return null;
}

export interface MapViewProps {
  graphics: Graphic[];
  selectedId: string | null;
  selectedVertexIndex: number | null;
  tool: DrawTool;
  draft: LatLng[];
  hoverRef: MutableRefObject<LatLng | null>;
  headingDeg: number;
  linearTargetPreview: {
    headingDeg: number;
    entity: string;
    identity: string;
    status: string;
  } | null;
  cmAreaDraw: "circle" | "polygon" | null;
  fitRequest: FitRequest | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onMapClick: (ll: LatLng) => void;
  onFinish: () => void;
  onMoveVertex: (id: string, index: number, ll: LatLng) => void;
  onInsertVertex: (id: string, index: number, ll: LatLng) => void;
  onRemoveVertex: (id: string, index: number) => void;
  onSelectVertex: (index: number) => void;
  onTranslate: (id: string, dLat: number, dLng: number) => void;
  onRadius: (id: string, radiusM: number) => void;
  onHeading: (id: string, headingDeg: number) => void;
  onRectangleHeading: (deg: number) => void;
  onHeadingDelta: (deg: number) => void;
  onEraseIds: (ids: string[]) => void;
}

export function MapView({
  graphics,
  selectedId,
  selectedVertexIndex,
  tool,
  draft,
  onSelect,
  onDeselect,
  onMapClick,
  onFinish,
  onMoveVertex,
  onInsertVertex,
  onRemoveVertex,
  onSelectVertex,
  onTranslate,
  onRadius,
  onHeading,
  onRectangleHeading,
  onHeadingDelta,
  hoverRef,
  headingDeg,
  linearTargetPreview,
  cmAreaDraw,
  fitRequest,
  onEraseIds,
}: MapViewProps) {
  const beginDrag = useRef<(ll: LatLng) => void>(() => {});
  const ignoreNextClick = useRef(false);
  const selected = graphics.find((g) => g.id === selectedId) ?? null;
  const editing = tool === "select" && selected != null;

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={5}
      className={`h-full w-full${tool === "erase" ? " mgb-erase" : ""}`}
      doubleClickZoom={tool === "select" && !editing}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="http://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitImported request={fitRequest} />
      <MapInteraction
        tool={tool}
        draft={draft}
        headingDeg={headingDeg}
        linearTargetPreview={linearTargetPreview}
        cmAreaDraw={cmAreaDraw}
        hoverRef={hoverRef}
        onMapClick={onMapClick}
        onFinish={onFinish}
        onDeselect={onDeselect}
        ignoreNextClick={ignoreNextClick}
        allowDoubleClickZoom={tool === "select" && !editing}
        onRectangleHeading={onRectangleHeading}
        onHeadingDelta={onHeadingDelta}
        captureWheel={tool === "rectangle" && draft.length >= 1}
      />
      <ShapeDragController
        beginRef={beginDrag}
        ignoreNextClick={ignoreNextClick}
        onDelta={(dLat, dLng) => {
          if (selectedId) onTranslate(selectedId, dLat, dLng);
        }}
      />
      <EraseBoxController
        enabled={tool === "erase"}
        graphics={graphics}
        onEraseIds={onEraseIds}
        ignoreNextClick={ignoreNextClick}
      />
      {graphics.map((g) => (
        <ErrorBoundary
          key={g.id}
          resetKey={g.id}
          fallback={null}
        >
          <GraphicShape
            graphic={g}
            selected={g.id === selectedId}
            editing={editing && g.id === selectedId}
            onSelect={onSelect}
            onBeginMove={(ll) => beginDrag.current(ll)}
            onMoveVertex={onMoveVertex}
          />
        </ErrorBoundary>
      ))}
      {editing && selected && (
        <ErrorBoundary resetKey={selected.id} fallback={null}>
          <EditHandles
            graphic={selected}
            selectedVertexIndex={selectedVertexIndex}
            onMoveVertex={(index, ll) => onMoveVertex(selected.id, index, ll)}
            onInsertVertex={(index, ll) => onInsertVertex(selected.id, index, ll)}
            onRemoveVertex={(index) => onRemoveVertex(selected.id, index)}
            onSelectVertex={onSelectVertex}
            onRadius={(radiusM) => onRadius(selected.id, radiusM)}
            onHeading={(deg) => onHeading(selected.id, deg)}
          />
        </ErrorBoundary>
      )}
    </MapContainer>
  );
}

function MapInteraction({
  tool,
  draft,
  headingDeg,
  linearTargetPreview,
  cmAreaDraw,
  hoverRef,
  onMapClick,
  onFinish,
  onDeselect,
  ignoreNextClick,
  allowDoubleClickZoom,
  onRectangleHeading,
  onHeadingDelta,
  captureWheel,
}: {
  tool: DrawTool;
  draft: LatLng[];
  headingDeg: number;
  linearTargetPreview: {
    headingDeg: number;
    entity: string;
    identity: string;
    status: string;
  } | null;
  cmAreaDraw: "circle" | "polygon" | null;
  hoverRef: MutableRefObject<LatLng | null>;
  onMapClick: (ll: LatLng) => void;
  onFinish: () => void;
  onDeselect: () => void;
  ignoreNextClick: MutableRefObject<boolean>;
  allowDoubleClickZoom: boolean;
  onRectangleHeading: (deg: number) => void;
  onHeadingDelta: (deg: number) => void;
  captureWheel: boolean;
}) {
  const [hover, setHover] = useState<LatLng | null>(null);
  const rafRef = useRef(0);
  const pendingRef = useRef<LatLng | null>(null);
  const headingRaf = useRef(0);
  const headingPending = useRef<number | null>(null);
  const onRectHeadingRef = useRef(onRectangleHeading);
  onRectHeadingRef.current = onRectangleHeading;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (headingRaf.current) cancelAnimationFrame(headingRaf.current);
    };
  }, []);

  const queueHover = (ll: LatLng | null) => {
    hoverRef.current = ll;
    pendingRef.current = ll;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setHover(pendingRef.current);
    });
  };

  const queueRectangleHeading = (deg: number) => {
    headingPending.current = deg;
    if (headingRaf.current) return;
    headingRaf.current = requestAnimationFrame(() => {
      headingRaf.current = 0;
      const d = headingPending.current;
      if (d != null) onRectHeadingRef.current(d);
    });
  };

  return (
    <>
      <MapClickHandler
        tool={tool}
        draft={draft}
        onMapClick={onMapClick}
        onFinish={onFinish}
        onDeselect={onDeselect}
        ignoreNextClick={ignoreNextClick}
        allowDoubleClickZoom={allowDoubleClickZoom}
        onHover={queueHover}
        onRectangleHeading={queueRectangleHeading}
        onHeadingDelta={onHeadingDelta}
        captureWheel={captureWheel}
      />
      <DraftShape
        tool={tool}
        draft={draft}
        hover={hover}
        headingDeg={headingDeg}
        linearTargetPreview={linearTargetPreview}
        cmAreaDraw={cmAreaDraw}
      />
    </>
  );
}
