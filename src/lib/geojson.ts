import { parseSidc } from "../domain/sidc";
import { findControlMeasure } from "../catalogs/controlMeasurePoints";
import { CM_INK, isCmLinePointGraphic } from "./cmLine";
import {
  isLinearTarget,
  normalizeLinearTarget,
  parseFireSystem,
} from "./linearTarget";
import { newId } from "./id";
import { minVertices } from "./geometryEdit";
import {
  DEFAULT_STYLE,
  type DashStyle,
  type Graphic,
  type GraphicKind,
  type LatLng,
} from "../types/graphic";

export type ImportSource = "geojson" | "native" | "kml" | "kmz" | "csv";

export type ImportResult =
  | { ok: true; graphics: Graphic[]; skipped: number; source: ImportSource }
  | { ok: false; error: string };

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toLatLng(coord: unknown): LatLng | null {
  if (!Array.isArray(coord) || coord.length < 2) return null;
  const lng = coord[0];
  const lat = coord[1];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lat, lng];
}

function linePositions(coords: unknown): LatLng[] | null {
  if (!Array.isArray(coords)) return null;
  const pts: LatLng[] = [];
  for (const c of coords) {
    const ll = toLatLng(c);
    if (!ll) return null;
    pts.push(ll);
  }
  return pts;
}

function ringPositions(coords: unknown): LatLng[] | null {
  const pts = linePositions(coords);
  if (!pts || pts.length < 3) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1] &&
    pts.length > 3
  ) {
    pts.pop();
  }
  return pts.length >= 3 ? pts : null;
}

function parseColor(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s;
  return undefined;
}

function parseDash(props: JsonObject): DashStyle | undefined {
  const dash = asString(props.dash)?.toLowerCase();
  if (dash === "solid" || dash === "dashed") return dash;
  const dashArray = asString(props["stroke-dasharray"]);
  if (dashArray && dashArray !== "none" && dashArray !== "0") return "dashed";
  return undefined;
}

function parseSymbol(props: JsonObject): Graphic["symbol"] {
  const sidc = asString(props.sidc);
  if (!sidc || !/^\d{20}$/.test(sidc)) return undefined;
  const parsed = parseSidc(sidc);
  if (!parsed) return undefined;
  return {
    standard: parsed.standard,
    symbolSet: parsed.symbolSet,
    entity: parsed.entity,
    identity: parsed.identity,
    status: parsed.status,
    uniqueDesignation:
      asString(props.uniqueDesignation) ?? asString(props.T) ?? asString(props.T1),
    uniqueDesignation2:
      asString(props.uniqueDesignation2) ?? asString(props.T2),
    additionalInformation: asString(props.additionalInformation),
    dtg: asString(props.dtg) ?? asString(props.W),
    targetNumber:
      asString(props.targetNumber) ?? asString(props.AP) ?? asString(props.ap),
    equipmentType: parseFireSystem(
      asString(props.equipmentType) ?? asString(props.V) ?? asString(props.v),
    ),
    fieldB:
      asString(props.fieldB) ??
      asString(props.B) ??
      asString(props.fieldB1) ??
      (parsed.amplifier !== "00" ? parsed.amplifier : undefined),
    sidc,
  };
}

function parseKind(v: unknown): GraphicKind | undefined {
  if (
    v === "point" ||
    v === "line" ||
    v === "rectangle" ||
    v === "polygon" ||
    v === "circle"
  ) {
    return v;
  }
  return undefined;
}

function circleCenterFromProps(
  props: JsonObject,
  pts: LatLng[],
): LatLng | null {
  const lat = asNumber(props.centerLat) ?? asNumber(props.center_lat);
  const lng = asNumber(props.centerLng) ?? asNumber(props.center_lng);
  if (lat != null && lng != null) return [lat, lng];
  if (pts.length === 0) return null;
  const s = pts.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as LatLng,
    [0, 0] as LatLng,
  );
  return [s[0] / pts.length, s[1] / pts.length];
}

function parseRadiusM(props: JsonObject): number | undefined {
  const n =
    asNumber(props.radiusM) ??
    asNumber(props.radius) ??
    asNumber(props.radius_m);
  if (n == null || n <= 0) return undefined;
  return n;
}

function styleFromProps(props: JsonObject): Pick<
  Graphic,
  "color" | "fillOpacity" | "weight" | "dash" | "remarks" | "name"
> {
  const color =
    parseColor(props.color) ??
    parseColor(props.stroke) ??
    parseColor(props.fill) ??
    DEFAULT_STYLE.color;
  const fillOpacity =
    asNumber(props.fillOpacity) ??
    asNumber(props["fill-opacity"]) ??
    DEFAULT_STYLE.fillOpacity;
  const weight =
    asNumber(props.weight) ??
    asNumber(props["stroke-width"]) ??
    DEFAULT_STYLE.weight;
  return {
    name: asString(props.name) ?? asString(props.title) ?? "",
    color,
    fillOpacity: Math.min(1, Math.max(0, fillOpacity)),
    weight: Math.min(12, Math.max(1, weight)),
    dash: parseDash(props) ?? DEFAULT_STYLE.dash,
    remarks: asString(props.remarks) ?? asString(props.description) ?? "",
  };
}

function makeGraphic(
  kind: GraphicKind,
  positions: LatLng[],
  props: JsonObject,
  fallbackName: string,
  radiusM?: number,
): Graphic | null {
  const symbol = parseSymbol(props);
  const cmLine =
    isLinearTarget(symbol?.entity) ||
    findControlMeasure(symbol?.entity ?? "")?.geometry === "line";
  if (kind === "line" && positions.length < (cmLine ? 1 : minVertices("line"))) {
    return null;
  }
  if (kind === "polygon" && positions.length < minVertices("polygon")) return null;
  if (kind === "rectangle" && positions.length < minVertices("rectangle")) return null;
  if ((kind === "point" || kind === "circle") && positions.length < 1) return null;
  const style = styleFromProps(props);
  const headingDeg =
    kind === "rectangle" || cmLine
      ? (asNumber(props.headingDeg) ??
        asNumber(props.heading) ??
        asNumber(props.attitude))
      : undefined;
  const graphic: Graphic = {
    id: newId(),
    name: style.name || fallbackName,
    kind,
    color: cmLine ? CM_INK : style.color,
    fillOpacity: style.fillOpacity,
    weight: style.weight,
    dash: style.dash,
    positions,
    radiusM: kind === "circle" ? (radiusM ?? 500) : undefined,
    lengthM: asNumber(props.lengthM) ?? asNumber(props.length),
    headingDeg,
    symbol,
    remarks: style.remarks,
    createdAt: asString(props.createdAt) ?? new Date().toISOString(),
  };
  if (isLinearTarget(symbol?.entity)) {
    return normalizeLinearTarget(graphic);
  }
  return graphic;
}

function pushGraphic(
  out: Graphic[],
  graphic: Graphic | null,
  skipped: { n: number },
): void {
  if (graphic) out.push(graphic);
  else skipped.n += 1;
}

function geometryToGraphics(
  geometry: JsonObject,
  props: JsonObject,
  out: Graphic[],
  skipped: { n: number },
  nameIndex: { n: number },
): void {
  const type = asString(geometry.type);
  const coords = geometry.coordinates;
  const nextName = (kind: GraphicKind): string => {
    nameIndex.n += 1;
    const labels: Record<GraphicKind, string> = {
      point: "Point",
      line: "Line",
      rectangle: "Rectangle",
      polygon: "Area",
      circle: "Circle",
    };
    return `Imported ${labels[kind]} ${nameIndex.n}`;
  };

  if (type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
    for (const g of geometry.geometries) {
      if (isObject(g)) geometryToGraphics(g, props, out, skipped, nameIndex);
      else skipped.n += 1;
    }
    return;
  }

  if (type === "Point") {
    const ll = toLatLng(coords);
    if (!ll) {
      skipped.n += 1;
      return;
    }
    const kindHint = parseKind(props.kind);
    const radiusM = parseRadiusM(props);
    const imported = parseSymbol(props);
    const kind: GraphicKind =
      isLinearTarget(imported?.entity) ||
        kindHint === "line" ||
        findControlMeasure(imported?.entity ?? "")?.geometry === "line"
        ? "line"
        : kindHint === "circle" ||
            (kindHint !== "point" && asNumber(props.radiusM) != null)
          ? "circle"
          : "point";
    pushGraphic(
      out,
      makeGraphic(kind, [ll], props, nextName(kind), radiusM),
      skipped,
    );
    return;
  }

  if (type === "MultiPoint") {
    if (!Array.isArray(coords)) {
      skipped.n += 1;
      return;
    }
    for (const c of coords) {
      const ll = toLatLng(c);
      if (!ll) {
        skipped.n += 1;
        continue;
      }
      pushGraphic(
        out,
        makeGraphic("point", [ll], props, nextName("point")),
        skipped,
      );
    }
    return;
  }

  if (type === "LineString") {
    const pts = linePositions(coords);
    pushGraphic(
      out,
      pts ? makeGraphic("line", pts, props, nextName("line")) : null,
      skipped,
    );
    return;
  }

  if (type === "MultiLineString") {
    if (!Array.isArray(coords)) {
      skipped.n += 1;
      return;
    }
    for (const line of coords) {
      const pts = linePositions(line);
      pushGraphic(
        out,
        pts ? makeGraphic("line", pts, props, nextName("line")) : null,
        skipped,
      );
    }
    return;
  }

  if (type === "Polygon") {
    if (!Array.isArray(coords) || coords.length === 0) {
      skipped.n += 1;
      return;
    }
    const pts = ringPositions(coords[0]);
    if (pts && parseKind(props.kind) === "rectangle" && pts.length >= 4) {
      pushGraphic(
        out,
        makeGraphic("rectangle", pts.slice(0, 4), props, nextName("rectangle")),
        skipped,
      );
      return;
    }
    if (
      pts &&
      parseKind(props.kind) === "circle" &&
      parseRadiusM(props) != null
    ) {
      const center = circleCenterFromProps(props, pts);
      pushGraphic(
        out,
        center
          ? makeGraphic(
              "circle",
              [center],
              props,
              nextName("circle"),
              parseRadiusM(props),
            )
          : null,
        skipped,
      );
      return;
    }
    pushGraphic(
      out,
      pts ? makeGraphic("polygon", pts, props, nextName("polygon")) : null,
      skipped,
    );
    return;
  }

  if (type === "MultiPolygon") {
    if (!Array.isArray(coords)) {
      skipped.n += 1;
      return;
    }
    for (const poly of coords) {
      if (!Array.isArray(poly) || poly.length === 0) {
        skipped.n += 1;
        continue;
      }
      const pts = ringPositions(poly[0]);
      pushGraphic(
        out,
        pts ? makeGraphic("polygon", pts, props, nextName("polygon")) : null,
        skipped,
      );
    }
    return;
  }

  skipped.n += 1;
}

function featureToGraphics(
  feature: JsonObject,
  out: Graphic[],
  skipped: { n: number },
  nameIndex: { n: number },
): void {
  const geometry = feature.geometry;
  if (!isObject(geometry)) {
    skipped.n += 1;
    return;
  }
  const props = isObject(feature.properties) ? feature.properties : {};
  geometryToGraphics(geometry, props, out, skipped, nameIndex);
}

function isNativeGraphic(v: unknown): v is Graphic {
  if (!isObject(v)) return false;
  const kind = v.kind;
  if (
    kind !== "point" &&
    kind !== "line" &&
    kind !== "rectangle" &&
    kind !== "polygon" &&
    kind !== "circle"
  ) {
    return false;
  }
  return Array.isArray(v.positions);
}

function normalizeNative(raw: Graphic[]): Graphic[] {
  return raw.flatMap((g) => {
    const pts = g.positions.filter(
      (p): p is LatLng =>
        Array.isArray(p) &&
        p.length >= 2 &&
        typeof p[0] === "number" &&
        typeof p[1] === "number" &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]),
    );
    const kind = parseKind(g.kind);
    if (!kind) return [];
    const graphic = makeGraphic(
      kind,
      pts,
      {
        name: g.name,
        color: g.color,
        fillOpacity: g.fillOpacity,
        weight: g.weight,
        dash: g.dash,
        remarks: g.remarks,
        createdAt: g.createdAt,
        radiusM: g.radiusM,
        lengthM: g.lengthM,
        headingDeg: g.headingDeg,
        sidc: g.symbol?.sidc,
        uniqueDesignation: g.symbol?.uniqueDesignation,
        uniqueDesignation2: g.symbol?.uniqueDesignation2,
        dtg: g.symbol?.dtg,
        fieldB: g.symbol?.fieldB,
        targetNumber: g.symbol?.targetNumber,
        equipmentType: g.symbol?.equipmentType,
      },
      g.name || "Imported graphic",
      g.radiusM,
    );
    return graphic ? [graphic] : [];
  });
}

export function importGraphicsFromUnknown(input: unknown): ImportResult {
  if (input == null) {
    return { ok: false, error: "File is empty." };
  }

  if (Array.isArray(input) && input.every(isNativeGraphic)) {
    const graphics = normalizeNative(input);
    return {
      ok: true,
      graphics,
      skipped: Math.max(0, input.length - graphics.length),
      source: "native",
    };
  }

  if (!isObject(input)) {
    return { ok: false, error: "Not a GeoJSON object or graphics list." };
  }

  const graphics: Graphic[] = [];
  const skipped = { n: 0 };
  const nameIndex = { n: 0 };
  const type = asString(input.type);

  if (type === "FeatureCollection") {
    if (!Array.isArray(input.features)) {
      return { ok: false, error: "FeatureCollection is missing a features array." };
    }
    for (const f of input.features) {
      if (isObject(f) && f.type === "Feature") featureToGraphics(f, graphics, skipped, nameIndex);
      else skipped.n += 1;
    }
    return { ok: true, graphics, skipped: skipped.n, source: "geojson" };
  }

  if (type === "Feature") {
    featureToGraphics(input, graphics, skipped, nameIndex);
    return { ok: true, graphics, skipped: skipped.n, source: "geojson" };
  }

  if (
    type === "Point" ||
    type === "MultiPoint" ||
    type === "LineString" ||
    type === "MultiLineString" ||
    type === "Polygon" ||
    type === "MultiPolygon" ||
    type === "GeometryCollection"
  ) {
    geometryToGraphics(input, {}, graphics, skipped, nameIndex);
    return { ok: true, graphics, skipped: skipped.n, source: "geojson" };
  }

  return {
    ok: false,
    error: "Unsupported JSON. Use a GeoJSON FeatureCollection, Feature, or geometry.",
  };
}

export function importGraphicsFromText(text: string): ImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "File is empty." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Could not parse JSON." };
  }
  return importGraphicsFromUnknown(parsed);
}

function propsFromGraphic(g: Graphic): JsonObject {
  const props: JsonObject = {
    id: g.id,
    name: g.name,
    kind: g.kind,
    color: g.color,
    fillOpacity: g.fillOpacity,
    weight: g.weight,
    dash: g.dash,
    remarks: g.remarks,
  };
  if (g.kind === "circle") props.radiusM = g.radiusM ?? 0;
  if (g.lengthM != null) props.lengthM = g.lengthM;
  if (
    (g.kind === "rectangle" || isLinearTarget(g.symbol?.entity)) &&
    g.headingDeg != null
  ) {
    props.headingDeg = g.headingDeg;
  }
  if (g.symbol) {
    props.sidc = g.symbol.sidc;
    props.standard = g.symbol.standard;
    props.uniqueDesignation = g.symbol.uniqueDesignation ?? "";
    if (g.symbol.uniqueDesignation2)
      props.uniqueDesignation2 = g.symbol.uniqueDesignation2;
    if (g.symbol.dtg) props.dtg = g.symbol.dtg;
    if (g.symbol.fieldB) props.fieldB = g.symbol.fieldB;
    if (g.symbol.targetNumber) props.targetNumber = g.symbol.targetNumber;
    if (g.symbol.equipmentType) props.equipmentType = g.symbol.equipmentType;
  }
  return props;
}

export function graphicsToGeoJson(graphics: Graphic[]): string {
  const features = graphics.map((g) => {
    if (g.kind === "point" || g.kind === "circle") {
      const [lat, lng] = g.positions[0] ?? [0, 0];
      return {
        type: "Feature",
        properties: propsFromGraphic(g),
        geometry: { type: "Point", coordinates: [lng, lat] },
      };
    }
    if (isCmLinePointGraphic(g) && g.positions[0]) {
      const [lat, lng] = g.positions[0];
      return {
        type: "Feature",
        properties: propsFromGraphic(g),
        geometry: { type: "Point", coordinates: [lng, lat] },
      };
    }
    const coords = g.positions.map(([lat, lng]) => [lng, lat]);
    if ((g.kind === "polygon" || g.kind === "rectangle") && coords.length > 0) {
      const closed = [...coords, coords[0]];
      return {
        type: "Feature",
        properties: propsFromGraphic(g),
        geometry: { type: "Polygon", coordinates: [closed] },
      };
    }
    return {
      type: "Feature",
      properties: propsFromGraphic(g),
      geometry: { type: "LineString", coordinates: coords },
    };
  });

  return JSON.stringify({ type: "FeatureCollection", features }, null, 2);
}

