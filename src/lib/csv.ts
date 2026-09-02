import { importGraphicsFromUnknown, type ImportResult } from "./geojson";
import { parseWkt, toWkt } from "./wkt";
import type { Graphic } from "../types/graphic";

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function detectDelimiter(headerLine: string): string {
  const counts = {
    ",": (headerLine.match(/,/g) ?? []).length,
    ";": (headerLine.match(/;/g) ?? []).length,
    "\t": (headerLine.match(/\t/g) ?? []).length,
  };
  if (counts["\t"] > 0 && counts["\t"] >= counts[","] && counts["\t"] >= counts[";"]) {
    return "\t";
  }
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

export function parseCsvRows(text: string): string[][] {
  const src = stripBom(text);
  const firstNl = src.search(/\r\n|\n|\r/);
  const headerLine = firstNl === -1 ? src : src.slice(0, firstNl);
  const delim = detectDelimiter(headerLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delim) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || (ch === "\r" && src[i + 1] !== "\n") || (ch === "\r" && src[i + 1] === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      i += ch === "\r" && src[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

function csvEscape(value: string): string {
  if (/[",\n\r;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const LAT_KEYS = new Set(["lat", "latitude", "y", "lat_dd", "latdd"]);
const LNG_KEYS = new Set(["lng", "lon", "long", "longitude", "x", "lon_dd", "londd"]);
const NAME_KEYS = new Set(["name", "title", "label"]);
const KIND_KEYS = new Set(["kind", "type", "graphic"]);
const WKT_KEYS = new Set(["wkt", "geom", "geometry", "wkt_geom", "shape"]);
const COLOR_KEYS = new Set(["color", "colour", "stroke", "fill"]);
const RADIUS_KEYS = new Set(["radiusm", "radius", "radius_m", "radius_meters"]);
const REMARKS_KEYS = new Set(["remarks", "description", "comment", "notes"]);
const WEIGHT_KEYS = new Set(["weight", "strokewidth", "stroke-width", "stroke_width"]);
const FILL_KEYS = new Set(["fillopacity", "fill-opacity", "fill_opacity"]);
const DASH_KEYS = new Set(["dash", "linestyle", "line-style"]);
const HEADING_KEYS = new Set(["headingdeg", "heading", "attitude", "course"]);

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(row: Record<string, string>, keys: Set<string>): string | undefined {
  for (const [k, v] of Object.entries(row)) {
    if (keys.has(k) && v.trim()) return v.trim();
  }
  return undefined;
}

function toNum(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function graphicsFromCsv(text: string): ImportResult {
  const rows = parseCsvRows(text);
  const header = rows[0];
  if (!header || header.length === 0) {
    return { ok: false, error: "CSV is empty." };
  }
  const keys = header.map(normHeader);
  const hasLat = keys.some((k) => LAT_KEYS.has(k));
  const hasLng = keys.some((k) => LNG_KEYS.has(k));
  const hasWkt = keys.some((k) => WKT_KEYS.has(k));
  if (!hasWkt && !(hasLat && hasLng)) {
    return {
      ok: false,
      error: "CSV needs lat/lng columns or a WKT/geometry column.",
    };
  }

  const features: unknown[] = [];
  let skipped = 0;
  for (const raw of rows.slice(1)) {
    const rec: Record<string, string> = {};
    keys.forEach((k, i) => {
      rec[k] = raw[i] ?? "";
    });
    const name = pick(rec, NAME_KEYS);
    const kind = pick(rec, KIND_KEYS);
    const color = pick(rec, COLOR_KEYS);
    const remarks = pick(rec, REMARKS_KEYS);
    const radiusM = toNum(pick(rec, RADIUS_KEYS));
    const weight = toNum(pick(rec, WEIGHT_KEYS));
    const fillOpacity = toNum(pick(rec, FILL_KEYS));
    const dash = pick(rec, DASH_KEYS);
    const headingDeg = toNum(pick(rec, HEADING_KEYS));
    const properties: Record<string, unknown> = {};
    if (name) properties.name = name;
    if (kind) properties.kind = kind.toLowerCase();
    if (color) properties.color = color;
    if (remarks) properties.remarks = remarks;
    if (radiusM != null) properties.radiusM = radiusM;
    if (weight != null) properties.weight = weight;
    if (fillOpacity != null) properties.fillOpacity = fillOpacity;
    if (dash) properties.dash = dash;
    if (headingDeg != null) properties.headingDeg = headingDeg;

    const wkt = pick(rec, WKT_KEYS);
    if (wkt) {
      const geom = parseWkt(wkt);
      if (!geom) {
        skipped += 1;
        continue;
      }
      features.push({ type: "Feature", properties, geometry: geom });
      continue;
    }
    const lat = toNum(pick(rec, LAT_KEYS));
    const lng = toNum(pick(rec, LNG_KEYS));
    if (lat == null || lng == null) {
      skipped += 1;
      continue;
    }
    features.push({
      type: "Feature",
      properties,
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }

  const result = importGraphicsFromUnknown({
    type: "FeatureCollection",
    features,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    graphics: result.graphics,
    skipped: result.skipped + skipped,
    source: "csv",
  };
}

export function graphicsToCsv(graphics: Graphic[]): string {
  const header = [
    "name",
    "kind",
    "lat",
    "lng",
    "wkt",
    "color",
    "weight",
    "fillOpacity",
    "dash",
    "radiusM",
    "headingDeg",
    "remarks",
  ];
  const lines = [header.join(",")];
  for (const g of graphics) {
    const first = g.positions[0];
    const cells = [
      g.name,
      g.kind,
      first ? String(first[0]) : "",
      first ? String(first[1]) : "",
      toWkt(g.kind, g.positions),
      g.color,
      String(g.weight),
      String(g.fillOpacity),
      g.dash,
      g.kind === "circle" ? String(g.radiusM ?? "") : "",
      g.kind === "rectangle" && g.headingDeg != null ? String(g.headingDeg) : "",
      g.remarks,
    ];
    lines.push(cells.map((c) => csvEscape(c)).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
