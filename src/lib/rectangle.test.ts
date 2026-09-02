import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyRect,
  cornersFromRect,
  rectFromGraphic,
  rectFromOppositeCorners,
  setRectHeading,
} from "./rectangle";
import type { Graphic } from "../types/graphic";

function stub(positions: Graphic["positions"], headingDeg?: number): Graphic {
  return {
    id: "r",
    name: "R",
    kind: "rectangle",
    color: "#000",
    fillOpacity: 0.2,
    weight: 2,
    dash: "solid",
    positions,
    headingDeg,
    remarks: "",
    createdAt: "",
  };
}

test("opposite corners with heading 0 produce a north-aligned rectangle", () => {
  const rect = rectFromOppositeCorners([40, -105], [40.01, -104.99], 0);
  assert.equal(rect.headingDeg, 0);
  assert.ok(rect.lengthM > 0);
  assert.ok(rect.widthM > 0);
  const corners = cornersFromRect(rect);
  assert.equal(corners.length, 4);
});

test("rotating 90° swaps length and width axes but keeps area", () => {
  const a: Graphic["positions"][0] = [39.7, -104.9];
  const b: Graphic["positions"][0] = [39.71, -104.88];
  const r0 = rectFromOppositeCorners(a, b, 0);
  const g = applyRect(stub([], 0), r0);
  const rotated = setRectHeading(g, 90);
  const m0 = rectFromGraphic(g);
  const m1 = rectFromGraphic(rotated);
  assert.ok(m0 && m1);
  if (!m0 || !m1) return;
  assert.ok(Math.abs(m1.headingDeg - 90) < 1);
  const area0 = m0.lengthM * m0.widthM;
  const area1 = m1.lengthM * m1.widthM;
  assert.ok(Math.abs(area0 - area1) / area0 < 0.05);
});
