import type { LatLng } from "../types/graphic";

export type WktGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "MultiPoint"; coordinates: [number, number][] }
  | { type: "MultiLineString"; coordinates: [number, number][][] }
  | { type: "MultiPolygon"; coordinates: [number, number][][][] };

function tokenize(wkt: string): string[] {
  const tokens: string[] = [];
  const s = wkt.trim();
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === undefined) break;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if ("(),".includes(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    let j = i;
    while (j < s.length && s[j] !== undefined && !/\s|,|\(|\)/.test(s[j] ?? "")) {
      j += 1;
    }
    tokens.push(s.slice(i, j));
    i = j;
  }
  return tokens;
}

function parseNumber(tok: string | undefined): number | null {
  if (tok == null) return null;
  const n = Number(tok);
  return Number.isFinite(n) ? n : null;
}

function parsePointPair(
  tokens: string[],
  i: { n: number },
): [number, number] | null {
  const lng = parseNumber(tokens[i.n]);
  const lat = parseNumber(tokens[i.n + 1]);
  if (lng == null || lat == null) return null;
  i.n += 2;
  while (tokens[i.n] && tokens[i.n] !== "," && tokens[i.n] !== ")") {
    i.n += 1;
  }
  return [lng, lat];
}

function parseLine(tokens: string[], i: { n: number }): [number, number][] | null {
  if (tokens[i.n] !== "(") return null;
  i.n += 1;
  const pts: [number, number][] = [];
  while (i.n < tokens.length && tokens[i.n] !== ")") {
    if (tokens[i.n] === ",") {
      i.n += 1;
      continue;
    }
    const pt = parsePointPair(tokens, i);
    if (!pt) return null;
    pts.push(pt);
  }
  if (tokens[i.n] !== ")") return null;
  i.n += 1;
  return pts;
}

function parseRings(
  tokens: string[],
  i: { n: number },
): [number, number][][] | null {
  if (tokens[i.n] !== "(") return null;
  i.n += 1;
  const rings: [number, number][][] = [];
  while (i.n < tokens.length && tokens[i.n] !== ")") {
    if (tokens[i.n] === ",") {
      i.n += 1;
      continue;
    }
    const ring = parseLine(tokens, i);
    if (!ring) return null;
    rings.push(ring);
  }
  if (tokens[i.n] !== ")") return null;
  i.n += 1;
  return rings;
}

export function parseWkt(input: string): WktGeometry | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;
  const type = (tokens[0] ?? "").toUpperCase();
  let i = 1;
  if ((tokens[i] ?? "").toUpperCase() === "Z" || (tokens[i] ?? "").toUpperCase() === "ZM") {
    i += 1;
  }

  const idx = { n: i };

  if (type === "POINT") {
    if (tokens[idx.n] === "(") idx.n += 1;
    const pt = parsePointPair(tokens, idx);
    return pt ? { type: "Point", coordinates: pt } : null;
  }
  if (type === "LINESTRING") {
    const pts = parseLine(tokens, idx);
    return pts ? { type: "LineString", coordinates: pts } : null;
  }
  if (type === "POLYGON") {
    const rings = parseRings(tokens, idx);
    return rings ? { type: "Polygon", coordinates: rings } : null;
  }
  if (type === "MULTIPOINT") {
    const pts = parseLine(tokens, idx);
    return pts ? { type: "MultiPoint", coordinates: pts } : null;
  }
  if (type === "MULTILINESTRING") {
    const lines = parseRings(tokens, idx);
    return lines ? { type: "MultiLineString", coordinates: lines } : null;
  }
  if (type === "MULTIPOLYGON") {
    if (tokens[idx.n] !== "(") return null;
    idx.n += 1;
    const polys: [number, number][][][] = [];
    while (idx.n < tokens.length && tokens[idx.n] !== ")") {
      if (tokens[idx.n] === ",") {
        idx.n += 1;
        continue;
      }
      const rings = parseRings(tokens, idx);
      if (!rings) return null;
      polys.push(rings);
    }
    return { type: "MultiPolygon", coordinates: polys };
  }
  return null;
}

export function toWkt(
  kind: "point" | "line" | "polygon" | "circle" | "rectangle",
  positions: LatLng[],
): string {
  const pair = ([lat, lng]: LatLng) => `${lng} ${lat}`;
  if (kind === "point" || kind === "circle") {
    const p = positions[0] ?? [0, 0];
    return `POINT (${pair(p)})`;
  }
  if (kind === "line") {
    return `LINESTRING (${positions.map(pair).join(", ")})`;
  }
  const ring = [...positions, positions[0] ?? [0, 0]];
  return `POLYGON ((${ring.map(pair).join(", ")}))`;
}
