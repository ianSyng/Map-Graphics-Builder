import { circleRing } from "./geodesy";
import { importGraphicsFromUnknown, type ImportResult } from "./geojson";
import { isCmLinePointGraphic } from "./cmLine";
import { isLinearTargetGraphic } from "./linearTarget";
import type { Graphic, LatLng } from "../types/graphic";

function localName(el: Element): string {
  return (el.localName || el.tagName.replace(/^.*:/, "")).toLowerCase();
}

function childElements(el: Element): Element[] {
  const out: Element[] = [];
  const kids = el.childNodes;
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i];
    if (n && n.nodeType === 1) out.push(n as Element);
  }
  return out;
}

function firstChild(el: Element, name: string): Element | null {
  return childElements(el).find((c) => localName(c) === name) ?? null;
}

function textOf(el: Element | null | undefined): string {
  if (!el) return "";
  return (el.textContent ?? "").trim();
}

function descendantsNamed(el: Element, name: string): Element[] {
  const out: Element[] = [];
  const walk = (node: Element) => {
    if (localName(node) === name) out.push(node);
    for (const c of childElements(node)) walk(c);
  };
  for (const c of childElements(el)) walk(c);
  return out;
}

function parseKmlCoords(text: string): LatLng[] {
  const pts: LatLng[] = [];
  for (const tuple of text.trim().split(/\s+/)) {
    if (!tuple) continue;
    const parts = tuple.split(",");
    const lng = Number(parts[0]);
    const lat = Number(parts[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng]);
  }
  return pts;
}

function kmlColorToCss(kml: string): { color: string; opacity: number } | null {
  const s = kml.trim();
  if (!/^[\da-f]{6,8}$/i.test(s)) return null;
  const hex = s.length === 6 ? `ff${s}` : s;
  const aa = parseInt(hex.slice(0, 2), 16);
  const bb = hex.slice(2, 4);
  const gg = hex.slice(4, 6);
  const rr = hex.slice(6, 8);
  return { color: `#${rr}${gg}${bb}`.toLowerCase(), opacity: aa / 255 };
}

function cssToKmlColor(hex: string, opacity: number): string {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) h = "38bdf8";
  const rr = h.slice(0, 2);
  const gg = h.slice(2, 4);
  const bb = h.slice(4, 6);
  const aa = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${aa}${bb}${gg}${rr}`.toLowerCase();
}

function extendedData(el: Element): Record<string, string> {
  const props: Record<string, string> = {};
  for (const data of descendantsNamed(el, "data")) {
    const name = data.getAttribute("name") ?? data.getAttribute("NAME");
    if (!name) continue;
    const value = textOf(firstChild(data, "value")) || textOf(data);
    if (value) props[name] = value;
  }
  for (const data of descendantsNamed(el, "simpledata")) {
    const name = data.getAttribute("name") ?? data.getAttribute("NAME");
    if (name && textOf(data)) props[name] = textOf(data);
  }
  return props;
}

function styleProps(el: Element): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const line = descendantsNamed(el, "linestyle")[0];
  const poly = descendantsNamed(el, "polystyle")[0];
  const lineColor = line ? textOf(firstChild(line, "color")) : "";
  const polyColor = poly ? textOf(firstChild(poly, "color")) : "";
  const width = line ? textOf(firstChild(line, "width")) : "";
  const parsed = kmlColorToCss(lineColor || polyColor);
  if (parsed) {
    props.color = parsed.color;
    if (polyColor) props.fillOpacity = parsed.opacity;
  }
  if (width) {
    const n = Number(width);
    if (Number.isFinite(n)) props.weight = n;
  }
  return props;
}

function geometriesIn(el: Element): { kind: "point" | "line" | "polygon"; pts: LatLng[] }[] {
  const out: { kind: "point" | "line" | "polygon"; pts: LatLng[] }[] = [];
  const visit = (node: Element) => {
    const n = localName(node);
    if (n === "point") {
      const pts = parseKmlCoords(textOf(descendantsNamed(node, "coordinates")[0] ?? null));
      if (pts[0]) out.push({ kind: "point", pts: [pts[0]] });
      return;
    }
    if (n === "linestring") {
      const pts = parseKmlCoords(textOf(descendantsNamed(node, "coordinates")[0] ?? null));
      if (pts.length) out.push({ kind: "line", pts });
      return;
    }
    if (n === "polygon" || n === "linearring") {
      const ring =
        n === "linearring"
          ? node
          : descendantsNamed(node, "linearring")[0];
      const pts = parseKmlCoords(textOf(ring ? descendantsNamed(ring, "coordinates")[0] ?? ring : null));
      if (pts.length) out.push({ kind: "polygon", pts });
      return;
    }
    if (n === "placemark" && node !== el) return;
    for (const c of childElements(node)) visit(c);
  };
  visit(el);
  return out;
}

function collectPlacemarks(root: Element): Element[] {
  const out: Element[] = [];
  const walk = (node: Element) => {
    if (localName(node) === "placemark") {
      out.push(node);
      return;
    }
    for (const c of childElements(node)) walk(c);
  };
  walk(root);
  return out;
}

export function parseKmlDocument(doc: Document): ImportResult {
  const root = doc.documentElement;
  if (!root) return { ok: false, error: "KML is empty." };
  const features: unknown[] = [];
  for (const pm of collectPlacemarks(root)) {
    const name = textOf(firstChild(pm, "name"));
    const description = textOf(firstChild(pm, "description"));
    const extra = extendedData(pm);
    const style = styleProps(pm);
    const geoms = geometriesIn(pm);
    if (geoms.length === 0) continue;
    for (const g of geoms) {
      const properties: Record<string, unknown> = {
        ...style,
        ...extra,
      };
      if (name) properties.name = extra.name ?? name;
      if (description && !properties.remarks && !properties.description) {
        properties.remarks = description;
      }
      if (g.kind === "point") {
        const pt = g.pts[0];
        if (!pt) continue;
        features.push({
          type: "Feature",
          properties,
          geometry: {
            type: "Point",
            coordinates: [pt[1], pt[0]],
          },
        });
      } else if (g.kind === "line") {
        features.push({
          type: "Feature",
          properties,
          geometry: {
            type: "LineString",
            coordinates: g.pts.map(([lat, lng]) => [lng, lat]),
          },
        });
      } else {
        const ring = [...g.pts.map(([lat, lng]) => [lng, lat])];
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
          ring.push(first);
        }
        features.push({
          type: "Feature",
          properties,
          geometry: { type: "Polygon", coordinates: [ring] },
        });
      }
    }
  }
  const result = importGraphicsFromUnknown({
    type: "FeatureCollection",
    features,
  });
  if (!result.ok) return result;
  return { ...result, source: "kml" };
}

export function parseKmlText(
  xml: string,
  parseXml: (source: string) => Document = (source) =>
    new DOMParser().parseFromString(source, "text/xml"),
): ImportResult {
  const trimmed = xml.trim();
  if (!trimmed) return { ok: false, error: "KML file is empty." };
  let doc: Document;
  try {
    doc = parseXml(trimmed);
  } catch {
    return { ok: false, error: "Could not parse KML." };
  }
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) return { ok: false, error: "Could not parse KML." };
  if (!doc.documentElement) return { ok: false, error: "KML is empty." };
  return parseKmlDocument(doc);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coordList(positions: LatLng[], close = false): string {
  const pts = close && positions[0] ? [...positions, positions[0]] : positions;
  return pts.map(([lat, lng]) => `${lng},${lat},0`).join(" ");
}

function dataEl(name: string, value: string): string {
  return `<Data name="${esc(name)}"><value>${esc(value)}</value></Data>`;
}

export function graphicsToKml(graphics: Graphic[]): string {
  const placemarks = graphics.map((g) => {
    const extra = [
      dataEl("kind", g.kind),
      dataEl("color", g.color),
      dataEl("weight", String(g.weight)),
      dataEl("fillOpacity", String(g.fillOpacity)),
      dataEl("dash", g.dash),
    ];
    if (
      (g.kind === "rectangle" || isCmLinePointGraphic(g)) &&
      g.headingDeg != null
    ) {
      extra.push(dataEl("headingDeg", String(g.headingDeg)));
    }
    if (isLinearTargetGraphic(g) && g.lengthM != null) {
      extra.push(dataEl("lengthM", String(g.lengthM)));
    }
    if (g.kind === "circle") {
      extra.push(dataEl("radiusM", String(g.radiusM ?? 0)));
      const c = g.positions[0];
      if (c) {
        extra.push(dataEl("centerLat", String(c[0])));
        extra.push(dataEl("centerLng", String(c[1])));
      }
    }
    const lineColor = cssToKmlColor(g.color, 1);
    const fillColor = cssToKmlColor(g.color, g.fillOpacity);
    const style = `<Style>
      <LineStyle><color>${lineColor}</color><width>${g.weight}</width></LineStyle>
      <PolyStyle><color>${fillColor}</color><fill>${g.kind === "line" || g.kind === "point" ? 0 : 1}</fill></PolyStyle>
    </Style>`;

    let geom = "";
    if (g.kind === "point" || isCmLinePointGraphic(g)) {
      geom = `<Point><coordinates>${coordList(g.positions)}</coordinates></Point>`;
    } else if (g.kind === "line") {
      geom = `<LineString><tessellate>1</tessellate><coordinates>${coordList(g.positions)}</coordinates></LineString>`;
    } else if (g.kind === "circle" && g.positions[0]) {
      const ring = circleRing(g.positions[0], g.radiusM ?? 500);
      geom = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordList(ring, true)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    } else {
      geom = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordList(g.positions, true)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    }

    const desc = g.remarks ? `<description>${esc(g.remarks)}</description>` : "";
    return `<Placemark>
      <name>${esc(g.name)}</name>
      ${desc}
      <ExtendedData>${extra.join("")}</ExtendedData>
      ${style}
      ${geom}
    </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Map Graphics Builder</name>
    ${placemarks.join("\n")}
  </Document>
</kml>
`;
}
