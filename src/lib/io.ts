import { graphicsFromCsv, graphicsToCsv } from "./csv";
import {
  graphicsToGeoJson,
  importGraphicsFromText,
  type ImportResult,
} from "./geojson";
import { graphicsToKml, parseKmlText } from "./kml";
import { graphicsToKmz, parseKmz } from "./kmz";
import type { Graphic } from "../types/graphic";

export type ExportFormat = "geojson" | "kml" | "kmz" | "csv";

const IMPORT_EXT = [".geojson", ".json", ".kml", ".kmz", ".csv", ".tsv"];

export function isLikelyImportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (IMPORT_EXT.some((ext) => name.endsWith(ext))) return true;
  if (!file.type) return true;
  return /geo\+json|json|kml|kmz|csv|tab-separated|excel/i.test(file.type);
}

function looksLikeKml(text: string): boolean {
  const t = text.trimStart();
  return /<\?xml/i.test(t.slice(0, 80)) || /<kml[\s>]/i.test(t.slice(0, 400));
}

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

export function importFromText(text: string, filename = ""): ImportResult {
  const name = filename.toLowerCase();
  if (name.endsWith(".kml") || looksLikeKml(text)) {
    return parseKmlText(text);
  }
  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    return graphicsFromCsv(text);
  }
  if (name.endsWith(".geojson") || name.endsWith(".json") || looksLikeJson(text)) {
    return importGraphicsFromText(text);
  }
  if (text.includes(",") || text.includes(";") || text.includes("\t")) {
    return graphicsFromCsv(text);
  }
  return {
    ok: false,
    error: "Unrecognized file. Use GeoJSON, KML, KMZ, or CSV.",
  };
}

export async function importFromFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isZip =
    name.endsWith(".kmz") ||
    file.type.includes("kmz") ||
    (bytes[0] === 0x50 && bytes[1] === 0x4b);
  if (isZip) {
    return parseKmz(buffer);
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  return importFromText(text, file.name);
}

export async function exportGraphics(
  graphics: Graphic[],
  format: ExportFormat,
): Promise<{ filename: string; mime: string; blob: Blob }> {
  if (format === "geojson") {
    return {
      filename: "map-graphics.geojson",
      mime: "application/geo+json",
      blob: new Blob([graphicsToGeoJson(graphics)], {
        type: "application/geo+json",
      }),
    };
  }
  if (format === "kml") {
    return {
      filename: "map-graphics.kml",
      mime: "application/vnd.google-earth.kml+xml",
      blob: new Blob([graphicsToKml(graphics)], {
        type: "application/vnd.google-earth.kml+xml",
      }),
    };
  }
  if (format === "kmz") {
    return {
      filename: "map-graphics.kmz",
      mime: "application/vnd.google-earth.kmz",
      blob: await graphicsToKmz(graphics),
    };
  }
  return {
    filename: "map-graphics.csv",
    mime: "text/csv;charset=utf-8",
    blob: new Blob([graphicsToCsv(graphics)], {
      type: "text/csv;charset=utf-8",
    }),
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
