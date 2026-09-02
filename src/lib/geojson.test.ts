import assert from "node:assert/strict";
import { test } from "node:test";
import {
  graphicsToGeoJson,
  importGraphicsFromText,
  importGraphicsFromUnknown,
} from "./geojson";

test("imports a FeatureCollection of point, line, and polygon", () => {
  const result = importGraphicsFromUnknown({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "HQ", color: "#ff0000" },
        geometry: { type: "Point", coordinates: [-104.99, 39.74] },
      },
      {
        type: "Feature",
        properties: { name: "MSR" },
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
        properties: { name: "AO", "fill-opacity": 0.4 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-105.05, 39.68],
              [-104.85, 39.68],
              [-104.85, 39.8],
              [-105.05, 39.8],
              [-105.05, 39.68],
            ],
          ],
        },
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics.length, 3);
  assert.equal(result.skipped, 0);
  const [point, line, area] = result.graphics;
  assert.equal(point?.kind, "point");
  assert.equal(point?.name, "HQ");
  assert.deepEqual(point?.positions[0], [39.74, -104.99]);
  assert.equal(line?.kind, "line");
  assert.equal(line?.positions.length, 2);
  assert.equal(area?.kind, "polygon");
  assert.equal(area?.positions.length, 4);
  assert.equal(area?.fillOpacity, 0.4);
});

test("imports a circle from Point + kind/radiusM", () => {
  const result = importGraphicsFromUnknown({
    type: "Feature",
    properties: { name: "Ring", kind: "circle", radiusM: 2500, color: "#00ff00" },
    geometry: { type: "Point", coordinates: [-98.5, 39.8] },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics[0]?.kind, "circle");
  assert.equal(result.graphics[0]?.radiusM, 2500);
  assert.deepEqual(result.graphics[0]?.positions[0], [39.8, -98.5]);
});

test("splits MultiLineString and MultiPolygon", () => {
  const result = importGraphicsFromUnknown({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
            [
              [2, 2],
              [3, 3],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
            [
              [
                [5, 5],
                [6, 5],
                [6, 6],
                [5, 5],
              ],
            ],
          ],
        },
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics.filter((g) => g.kind === "line").length, 2);
  assert.equal(result.graphics.filter((g) => g.kind === "polygon").length, 2);
});

test("round-trips export then import", () => {
  const first = importGraphicsFromUnknown({
    type: "Feature",
    properties: {
      name: "Box",
      kind: "polygon",
      color: "#abcdef",
      weight: 3,
      dash: "dashed",
      remarks: "keep me",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [1, 2],
          [3, 2],
          [3, 4],
          [1, 2],
        ],
      ],
    },
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const text = graphicsToGeoJson(first.graphics);
  const second = importGraphicsFromText(text);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.graphics.length, 1);
  const g = second.graphics[0];
  assert.equal(g?.name, "Box");
  assert.equal(g?.kind, "polygon");
  assert.equal(g?.color, "#abcdef");
  assert.equal(g?.weight, 3);
  assert.equal(g?.dash, "dashed");
  assert.equal(g?.remarks, "keep me");
  assert.equal(g?.positions.length, 3);
});

test("2525 line LineString keeps vertices (not collapsed to a point)", () => {
  const result = importGraphicsFromUnknown({
    type: "Feature",
    properties: {
      name: "FLOT",
      kind: "line",
      sidc: "10032500001401000000",
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [-98, 39],
        [-97.5, 39.2],
        [-97, 39.1],
      ],
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const g = result.graphics[0];
  assert.equal(g?.kind, "line");
  assert.equal(g?.symbol?.entity, "140100");
  assert.equal(g?.positions.length, 3);
  assert.equal(g?.color, "#e2e8f0");
  const round = importGraphicsFromText(graphicsToGeoJson([g!]));
  assert.equal(round.ok, true);
  if (!round.ok) return;
  assert.equal(round.graphics[0]?.positions.length, 3);
});

test("linear target Point stays a single center", () => {
  const result = importGraphicsFromUnknown({
    type: "Feature",
    properties: {
      name: "LT",
      kind: "line",
      sidc: "10032500002407010000",
      lengthM: 300,
      headingDeg: 90,
    },
    geometry: { type: "Point", coordinates: [-98, 39] },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const g = result.graphics[0];
  assert.equal(g?.positions.length, 1);
  assert.equal(g?.symbol?.entity, "240701");
  assert.equal(g?.lengthM, 300);
});

test("rejects invalid JSON", () => {
  const result = importGraphicsFromText("{ not json");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /parse/i);
});

test("skips null geometry", () => {
  const result = importGraphicsFromUnknown({
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: {}, geometry: null },
      {
        type: "Feature",
        properties: { name: "Ok" },
        geometry: { type: "Point", coordinates: [10, 20] },
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics.length, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.graphics[0]?.name, "Ok");
});
