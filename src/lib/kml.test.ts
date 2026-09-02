import assert from "node:assert/strict";
import { test } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import { graphicsToKml, parseKmlText } from "./kml";
import { graphicsToKmz, parseKmz } from "./kmz";
import { importGraphicsFromUnknown } from "./geojson";
import type { Graphic } from "../types/graphic";

function parseXml(source: string): Document {
  return new DOMParser().parseFromString(source, "text/xml") as unknown as Document;
}

function sampleGraphics(): Graphic[] {
  const result = importGraphicsFromUnknown({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "HQ", color: "#ff0000", kind: "point" },
        geometry: { type: "Point", coordinates: [-104.99, 39.74] },
      },
      {
        type: "Feature",
        properties: { name: "MSR", kind: "line" },
        geometry: {
          type: "LineString",
          coordinates: [
            [-105, 39.7],
            [-104.9, 39.75],
          ],
        },
      },
      {
        type: "Feature",
        properties: { name: "AO", kind: "polygon", remarks: "keep" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-105.05, 39.68],
              [-104.85, 39.68],
              [-104.85, 39.8],
              [-105.05, 39.68],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { name: "Ring", kind: "circle", radiusM: 2500 },
        geometry: { type: "Point", coordinates: [-98.5, 39.8] },
      },
    ],
  });
  if (!result.ok) throw new Error("fixture");
  return result.graphics;
}

test("KML round-trip preserves kinds", () => {
  const kml = graphicsToKml(sampleGraphics());
  const result = parseKmlText(kml, parseXml);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.source, "kml");
  const byName = Object.fromEntries(result.graphics.map((g) => [g.name, g]));
  assert.equal(byName.HQ?.kind, "point");
  assert.equal(byName.MSR?.kind, "line");
  assert.equal(byName.AO?.kind, "polygon");
  assert.equal(byName.Ring?.kind, "circle");
  assert.equal(byName.Ring?.radiusM, 2500);
  assert.equal(byName.AO?.remarks, "keep");
});

test("parses a Google-style Point placemark", () => {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Spot</name>
      <Point><coordinates>-104.99,39.74,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;
  const result = parseKmlText(kml, parseXml);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics[0]?.name, "Spot");
  assert.deepEqual(result.graphics[0]?.positions[0], [39.74, -104.99]);
});

test("KMZ round-trip", async () => {
  const blob = await graphicsToKmz(sampleGraphics());
  const buf = await blob.arrayBuffer();
  const result = await parseKmz(buf, parseXml);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.source, "kmz");
  assert.equal(result.graphics.length, 4);
  assert.ok(result.graphics.some((g) => g.kind === "circle"));
});
