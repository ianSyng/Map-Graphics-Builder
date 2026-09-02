import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWkt, toWkt } from "./wkt";

test("parses POINT, LINESTRING, POLYGON", () => {
  const pt = parseWkt("POINT (-104.99 39.74)");
  assert.equal(pt?.type, "Point");
  if (pt?.type !== "Point") return;
  assert.deepEqual(pt.coordinates, [-104.99, 39.74]);

  const line = parseWkt("LINESTRING (0 0, 1 1, 2 0)");
  assert.equal(line?.type, "LineString");
  if (line?.type !== "LineString") return;
  assert.equal(line.coordinates.length, 3);

  const poly = parseWkt(
    "POLYGON ((0 0, 1 0, 1 1, 0 0))",
  );
  assert.equal(poly?.type, "Polygon");
  if (poly?.type !== "Polygon") return;
  assert.equal(poly.coordinates[0]?.length, 4);
});

test("toWkt emits POINT / LINESTRING / POLYGON", () => {
  assert.equal(toWkt("point", [[39.5, -104.2]]), "POINT (-104.2 39.5)");
  assert.match(
    toWkt("line", [
      [0, 1],
      [2, 3],
    ]),
    /^LINESTRING \(/,
  );
  assert.match(toWkt("polygon", [[0, 0], [1, 0], [1, 1]]), /^POLYGON \(\(/);
});
