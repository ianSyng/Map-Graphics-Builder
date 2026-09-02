import type { GraphicSymbol } from "@/domain/sidc";

export type GraphicKind = "point" | "line" | "rectangle" | "polygon" | "circle";

export type DrawTool = "select" | "erase" | GraphicKind | "cm-point" | "cm-line";

export type DashStyle = "solid" | "dashed";

/** [lat, lng] */
export type LatLng = [number, number];

export interface Graphic {
  id: string;
  name: string;
  kind: GraphicKind;
  color: string;
  fillOpacity: number;
  weight: number;
  dash: DashStyle;
  positions: LatLng[];
  /** Circle radius in meters */
  radiusM?: number;
  /** Linear target length in meters (center + attitude). */
  lengthM?: number;
  /** Attitude: degrees clockwise from north (rectangle, linear target). */
  headingDeg?: number;
  /** 2525D/E control-measure (or later unit) symbol. */
  symbol?: GraphicSymbol;
  remarks: string;
  createdAt: string;
}

export const TOOL_LABELS: Record<DrawTool, string> = {
  select: "Select",
  erase: "Erase",
  point: "Point",
  line: "Line",
  rectangle: "Rectangle",
  polygon: "Area",
  circle: "Circle",
  "cm-point": "2525 Point",
  "cm-line": "2525 Line",
};

export const DEFAULT_STYLE: Pick<
  Graphic,
  "color" | "fillOpacity" | "weight" | "dash"
> = {
  color: "#38bdf8",
  fillOpacity: 0.18,
  weight: 2,
  dash: "solid",
};
