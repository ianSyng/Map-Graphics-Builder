import JSZip from "jszip";
import { graphicsToKml, parseKmlText } from "./kml";
import type { ImportResult } from "./geojson";
import type { Graphic } from "../types/graphic";

export async function parseKmz(
  buffer: ArrayBuffer,
  parseXml?: (source: string) => Document,
): Promise<ImportResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { ok: false, error: "Could not read KMZ (zip) file." };
  }
  const kmlFiles = zip.file(/\.kml$/i);
  if (kmlFiles.length === 0) {
    return { ok: false, error: "KMZ has no .kml file inside." };
  }
  const preferred =
    kmlFiles.find((f) => /(?:^|\/)doc\.kml$/i.test(f.name)) ?? kmlFiles[0];
  const ordered = [
    preferred,
    ...kmlFiles.filter((f) => f.name !== preferred.name),
  ];

  const graphics: Graphic[] = [];
  let skipped = 0;
  for (const file of ordered) {
    const text = await file.async("string");
    const result = parseKmlText(text, parseXml);
    if (!result.ok) {
      skipped += 1;
      continue;
    }
    graphics.push(...result.graphics);
    skipped += result.skipped;
  }
  if (graphics.length === 0) {
    return {
      ok: false,
      error: "KMZ did not contain any usable placemarks.",
    };
  }
  return { ok: true, graphics, skipped, source: "kmz" };
}

export async function graphicsToKmz(graphics: Graphic[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file("doc.kml", graphicsToKml(graphics));
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.google-earth.kmz",
  });
}
