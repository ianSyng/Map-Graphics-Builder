import assert from "node:assert/strict";
import { test } from "node:test";
import { graphicsFromCsv, graphicsToCsv } from "./csv";

test("imports points from lat/lng CSV", () => {
  const csv = `name,lat,lng,color
HQ,39.74,-104.99,#ff0000
`;
  const result = graphicsFromCsv(csv);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.source, "csv");
  assert.equal(result.graphics.length, 1);
  assert.equal(result.graphics[0]?.kind, "point");
  assert.deepEqual(result.graphics[0]?.positions[0], [39.74, -104.99]);
  assert.equal(result.graphics[0]?.color, "#ff0000");
});

test("imports WKT lines and polygons", () => {
  const csv = `name,wkt
MSR,"LINESTRING (-105 39.7, -104.9 39.75)"
AO,"POLYGON ((-105.05 39.68, -104.85 39.68, -104.85 39.8, -105.05 39.68))"
`;
  const result = graphicsFromCsv(csv);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics.length, 2);
  assert.equal(result.graphics[0]?.kind, "line");
  assert.equal(result.graphics[1]?.kind, "polygon");
});

test("imports a circle from kind + radiusM", () => {
  const csv = `name,kind,lat,lng,radiusM
Ring,circle,39.8,-98.5,2500
`;
  const result = graphicsFromCsv(csv);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.graphics[0]?.kind, "circle");
  assert.equal(result.graphics[0]?.radiusM, 2500);
});

test("round-trips CSV export", () => {
  const csv = `name,kind,lat,lng,color,remarks
Alpha,point,10,20,#abcdef,hello
`;
  const first = graphicsFromCsv(csv);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = graphicsFromCsv(graphicsToCsv(first.graphics));
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.graphics[0]?.name, "Alpha");
  assert.deepEqual(second.graphics[0]?.positions[0], [10, 20]);
  assert.equal(second.graphics[0]?.remarks, "hello");
});

test("rejects CSV without coordinates", () => {
  const result = graphicsFromCsv("name,color\nA,#fff\n");
  assert.equal(result.ok, false);
});
