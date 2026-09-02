import assert from "node:assert/strict";
import { test } from "node:test";
import { idsIntersectingBox } from "./eraseHit";
import type { Graphic } from "../types/graphic";

function g(
  id: string,
  kind: Graphic["kind"],
  positions: Graphic["positions"],
  extra: Partial<Graphic> = {},
): Graphic {
  return {
    id,
    name: id,
    kind,
    color: "#000",
    fillOpacity: 0.2,
    weight: 2,
    dash: "solid",
    positions,
    remarks: "",
    createdAt: "",
    ...extra,
  };
}

test("box deletes a point inside and skips one outside", () => {
  const graphics = [
    g("in", "point", [[40, -105]]),
    g("out", "point", [[10, 10]]),
  ];
  const ids = idsIntersectingBox(graphics, [39.9, -105.1], [40.1, -104.9]);
  assert.deepEqual(ids, ["in"]);
});

test("box deletes a line that crosses the box via its vertices", () => {
  const graphics = [
    g("line", "line", [
      [40, -105],
      [41, -104],
    ]),
  ];
  const ids = idsIntersectingBox(graphics, [39.5, -105.5], [40.5, -104.5]);
  assert.deepEqual(ids, ["line"]);
});
