import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTROL_MEASURE_AREAS } from "../catalogs/controlMeasureAreas";
import { findControlMeasure } from "../catalogs/controlMeasurePoints";
import { makeSymbol } from "../domain/sidc";
import {
  areaCentroid,
  cmAreaLabelLines,
  isCircularTarget,
  isCmAreaGraphic,
  isCmCircleArea,
  isCmPolygonArea,
} from "./cmArea";
import type { Graphic } from "../types/graphic";

function graphic(partial: Partial<Graphic> & Pick<Graphic, "kind" | "positions">): Graphic {
  return {
    id: "1",
    name: "x",
    color: "#e2e8f0",
    fillOpacity: 0,
    weight: 3,
    dash: "solid",
    remarks: "",
    createdAt: "",
    ...partial,
  };
}

test("area catalog has unique 6-digit entities and circular + polygon draws", () => {
  const codes = CONTROL_MEASURE_AREAS.map((d) => d.entity);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) assert.match(code, /^\d{6}$/);
  const circ = findControlMeasure("240803");
  assert.equal(circ?.name, "Circular target");
  assert.equal(circ?.geometry, "area");
  assert.equal(circ?.areaDraw, "circle");
  const ao = findControlMeasure("120100");
  assert.equal(ao?.abbrev, "AO");
  assert.equal(ao?.areaDraw, "polygon");
  const acaCirc = findControlMeasure("240103");
  const acaPoly = findControlMeasure("240101");
  assert.equal(acaCirc?.areaDraw, "circle");
  assert.equal(acaPoly?.areaDraw, "polygon");
});

test("circular target uses Field AP in the label", () => {
  const def = findControlMeasure("240803");
  const symbol = makeSymbol({
    standard: "2525D",
    entity: "240803",
    targetNumber: "DA0786",
  });
  assert.equal(isCircularTarget("240803"), true);
  assert.deepEqual(cmAreaLabelLines(def, symbol), ["DA0786"]);
});

test("AO label is abbrev plus unique designation", () => {
  const def = findControlMeasure("120100");
  const symbol = makeSymbol({
    standard: "2525D",
    entity: "120100",
    uniqueDesignation: "BUFFALO",
  });
  assert.deepEqual(cmAreaLabelLines(def, symbol), ["AO", "BUFFALO"]);
});

test("kind + SIDC identify circular vs multi-point 2525 areas", () => {
  const circle = graphic({
    kind: "circle",
    positions: [[39, -98]],
    radiusM: 400,
    symbol: makeSymbol({ standard: "2525D", entity: "240303" }),
  });
  const poly = graphic({
    kind: "polygon",
    positions: [
      [0, 0],
      [0, 3],
      [3, 0],
    ],
    symbol: makeSymbol({ standard: "2525D", entity: "120100" }),
  });
  assert.equal(isCmAreaGraphic(circle), true);
  assert.equal(isCmCircleArea(circle), true);
  assert.equal(isCmPolygonArea(circle), false);
  assert.equal(isCmAreaGraphic(poly), true);
  assert.equal(isCmPolygonArea(poly), true);
  assert.deepEqual(areaCentroid(poly.positions), [1, 1]);
});
