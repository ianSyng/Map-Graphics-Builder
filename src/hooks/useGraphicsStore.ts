import { useCallback, useEffect, useState } from "react";
import { loadGraphics, saveGraphics } from "@/lib/storage";
import { newId } from "@/lib/id";
import {
  insertVertex as insertVertexIn,
  moveVertex as moveVertexIn,
  removeVertex as removeVertexIn,
  setCircleRadius,
  translateGraphic as translateIn,
} from "@/lib/geometryEdit";
import { isCmLinePointGraphic } from "@/lib/cmLine";
import { normalizeHeading } from "@/lib/geodesy";
import {
  isLinearTargetGraphic,
  setLinearTargetLength,
} from "@/lib/linearTarget";
import {
  setRectHeading as setRectHeadingIn,
  setRectSize as setRectSizeIn,
} from "@/lib/rectangle";
import type { GraphicSymbol } from "@/domain/sidc";
import {
  DEFAULT_STYLE,
  type DrawTool,
  type Graphic,
  type GraphicKind,
  type LatLng,
} from "@/types/graphic";

export type AddGraphicExtra = {
  radiusM?: number;
  lengthM?: number;
  headingDeg?: number;
  symbol?: GraphicSymbol;
  name?: string;
  stayOnTool?: boolean;
  color?: string;
  dash?: Graphic["dash"];
  weight?: number;
};

function defaultName(kind: GraphicKind, n: number): string {
  const labels: Record<GraphicKind, string> = {
    point: "Point",
    line: "Line",
    rectangle: "Rectangle",
    polygon: "Area",
    circle: "Circle",
  };
  return `${labels[kind]} ${n}`;
}

export function useGraphicsStore() {
  const [graphics, setGraphics] = useState<Graphic[]>(() => loadGraphics());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(
    null,
  );
  const [tool, setTool] = useState<DrawTool>("select");
  const [draft, setDraft] = useState<LatLng[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => saveGraphics(graphics), 400);
    return () => window.clearTimeout(t);
  }, [graphics]);

  const selected = graphics.find((g) => g.id === selectedId) ?? null;

  const addGraphic = useCallback(
    (kind: GraphicKind, positions: LatLng[], extra?: AddGraphicExtra) => {
      const graphic: Graphic = {
        id: newId(),
        name: extra?.name || defaultName(kind, graphics.length + 1),
        kind,
        ...DEFAULT_STYLE,
        color: extra?.color ?? DEFAULT_STYLE.color,
        dash: extra?.dash ?? DEFAULT_STYLE.dash,
        weight: extra?.weight ?? DEFAULT_STYLE.weight,
        positions,
        radiusM: extra?.radiusM,
        lengthM: extra?.lengthM,
        headingDeg: extra?.headingDeg,
        symbol: extra?.symbol,
        remarks: "",
        createdAt: new Date().toISOString(),
      };
      setGraphics((prev) => [...prev, graphic]);
      setSelectedId(graphic.id);
      setSelectedVertexIndex(null);
      if (!extra?.stayOnTool) setTool("select");
      setDraft([]);
      return graphic.id;
    },
    [graphics.length],
  );

  const updateGraphic = useCallback(
    (id: string, patch: Partial<Graphic>) => {
      setGraphics((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      );
    },
    [],
  );

  const removeGraphics = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const drop = new Set(ids);
    setGraphics((prev) => prev.filter((g) => !drop.has(g.id)));
    setSelectedId((cur) => (cur && drop.has(cur) ? null : cur));
    setSelectedVertexIndex(null);
  }, []);

  const removeGraphic = useCallback(
    (id: string) => {
      removeGraphics([id]);
    },
    [removeGraphics],
  );

  const selectGraphic = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedVertexIndex(null);
    if (id) setTool("select");
  }, []);

  const moveVertex = useCallback((id: string, index: number, ll: LatLng) => {
    setGraphics((prev) =>
      prev.map((g) => (g.id === id ? moveVertexIn(g, index, ll) : g)),
    );
  }, []);

  const insertVertex = useCallback((id: string, index: number, ll: LatLng) => {
    setGraphics((prev) =>
      prev.map((g) => (g.id === id ? insertVertexIn(g, index, ll) : g)),
    );
    setSelectedVertexIndex(index);
  }, []);

  const removeVertex = useCallback((id: string, index: number) => {
    setGraphics((prev) =>
      prev.map((g) => (g.id === id ? removeVertexIn(g, index) : g)),
    );
    setSelectedVertexIndex((cur) => {
      if (cur == null) return null;
      if (cur === index) return null;
      if (cur > index) return cur - 1;
      return cur;
    });
  }, []);

  const translateGraphic = useCallback(
    (id: string, dLat: number, dLng: number) => {
      setGraphics((prev) =>
        prev.map((g) => (g.id === id ? translateIn(g, dLat, dLng) : g)),
      );
    },
    [],
  );

  const resizeCircle = useCallback((id: string, radiusM: number) => {
    setGraphics((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        if (isLinearTargetGraphic(g)) return setLinearTargetLength(g, radiusM);
        return setCircleRadius(g, radiusM);
      }),
    );
  }, []);

  const setRectHeading = useCallback((id: string, headingDeg: number) => {
    setGraphics((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        if (isCmLinePointGraphic(g)) {
          return { ...g, headingDeg: normalizeHeading(headingDeg) };
        }
        return setRectHeadingIn(g, headingDeg);
      }),
    );
  }, []);

  const setRectSize = useCallback(
    (id: string, patch: { lengthM?: number; widthM?: number }) => {
      setGraphics((prev) =>
        prev.map((g) => (g.id === id ? setRectSizeIn(g, patch) : g)),
      );
    },
    [],
  );

  const clearAll = useCallback(() => {
    setGraphics([]);
    setSelectedId(null);
    setSelectedVertexIndex(null);
    setDraft([]);
  }, []);

  const replaceAll = useCallback((next: Graphic[]) => {
    setGraphics(next);
    setSelectedId(null);
    setSelectedVertexIndex(null);
    setDraft([]);
  }, []);

  const appendGraphics = useCallback((next: Graphic[]) => {
    if (next.length === 0) return;
    setGraphics((prev) => [...prev, ...next]);
    setSelectedId(next[next.length - 1]?.id ?? null);
    setSelectedVertexIndex(null);
    setTool("select");
    setDraft([]);
  }, []);

  return {
    graphics,
    selected,
    selectedId,
    selectedVertexIndex,
    setSelectedVertexIndex,
    selectGraphic,
    setSelectedId,
    tool,
    setTool,
    draft,
    setDraft,
    addGraphic,
    updateGraphic,
    removeGraphic,
    removeGraphics,
    moveVertex,
    insertVertex,
    removeVertex,
    translateGraphic,
    resizeCircle,
    setRectHeading,
    setRectSize,
    clearAll,
    replaceAll,
    appendGraphics,
  };
}
