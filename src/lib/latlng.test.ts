import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanLatLngs,
  isFiniteLatLng,
  polygonPath,
  polylinePath,
  samePath,
} from "./latlng";

test("drops null, holes, and non-finite vertices", () => {
  assert.equal(isFiniteLatLng(null), false);
  assert.equal(isFiniteLatLng([null, null]), false);
  assert.equal(isFiniteLatLng([39, -98]), true);
  assert.deepEqual(
    cleanLatLngs([null, [39, -98], [NaN, 0], [39, -97], undefined, [1]]),
    [
      [39, -98],
      [39, -97],
    ],
  );
});

test("polylinePath rejects empty and single-point paths", () => {
  assert.equal(polylinePath([]), null);
  assert.equal(polylinePath([[39, -98]]), null);
  assert.equal(polylinePath([null, [null, null]]), null);
  assert.deepEqual(polylinePath([[39, -98], [39, -97]]), [
    [39, -98],
    [39, -97],
  ]);
});

test("polygonPath needs three vertices", () => {
  assert.equal(polygonPath([[0, 0], [1, 1]]), null);
  assert.equal(polygonPath([[0, 0], [1, 0], [0, 1]])?.length, 3);
});

test("samePath compares coordinates not identity", () => {
  const a: [number, number][] = [
    [39, -98],
    [39, -97],
  ];
  assert.equal(samePath(a, [[39, -98], [39, -97]]), true);
  assert.equal(samePath(a, [[39, -98], [40, -97]]), false);
});
