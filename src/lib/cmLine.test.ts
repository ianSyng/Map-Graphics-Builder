import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTROL_MEASURE_LINES } from "../catalogs/controlMeasureLines";
import { findControlMeasure } from "../catalogs/controlMeasurePoints";
import { makeSymbol } from "../domain/sidc";
import {
  cmLineCaption,
  cmStrokeColor,
  isCmLineGraphic,
  normalizeCmLineGraphic,
} from "./cmLine";
import { cmLineSvg } from "./cmLineSvg";
import type { Graphic } from "../types/graphic";

test("line catalog has unique 6-digit entities and includes phase line", () => {
  const codes = CONTROL_MEASURE_LINES.map((d) => d.entity);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) assert.match(code, /^\d{6}$/);
  const pl = findControlMeasure("140300");
  assert.equal(pl?.name, "Phase line");
  assert.equal(pl?.geometry, "line");
  assert.equal(pl?.abbrev, "PL");
  assert.equal(pl?.lineDraw, "phase");
});

test("phase line caption is PL plus unique designation", () => {
  const def = findControlMeasure("140300");
  const symbol = makeSymbol({
    standard: "2525D",
    entity: "140300",
    uniqueDesignation: "PLUTO",
  });
  assert.equal(cmLineCaption(def, symbol), "PL PLUTO");
  assert.equal(cmLineCaption(def, { ...symbol, uniqueDesignation: "" }), "PL");
});

test("2525 line ink matches point symbols (light stroke, gold when selected)", () => {
  assert.equal(cmStrokeColor("03"), "#e2e8f0");
  assert.equal(cmStrokeColor("06", true), "#fbbf24");
});

test("priority line styles: boundary, FLOT, FSCL", () => {
  assert.equal(findControlMeasure("110100")?.lineDraw, "boundary");
  assert.equal(findControlMeasure("140100")?.lineDraw, "flot");
  assert.equal(findControlMeasure("260100")?.lineDraw, "phase");
  assert.equal(findControlMeasure("260100")?.abbrev, "FSCL");
});

test("normalizeCmLineGraphic does not collapse a 2525 polyline", () => {
  const g: Graphic = {
    id: "1",
    name: "FLOT",
    kind: "line",
    color: "#e2e8f0",
    fillOpacity: 0,
    weight: 3,
    dash: "solid",
    positions: [
      [39, -98],
      [39.2, -97.5],
      [39.1, -97],
    ],
    remarks: "",
    createdAt: "",
    symbol: makeSymbol({ standard: "2525D", entity: "140100" }),
  };
  const n = normalizeCmLineGraphic(g);
  assert.equal(n.positions.length, 3);
  assert.deepEqual(n.positions, g.positions);
});

test("2525 line SVG glyph uses the same light ink as points", () => {
  const g: Graphic = {
    id: "1",
    name: "FLOT",
    kind: "line",
    color: "#e2e8f0",
    fillOpacity: 0,
    weight: 3,
    dash: "solid",
    positions: [[39, -98]],
    headingDeg: 90,
    remarks: "",
    createdAt: "",
    symbol: makeSymbol({ standard: "2525D", entity: "140100" }),
  };
  assert.equal(isCmLineGraphic(g), true);
  const svg = cmLineSvg(g, "#e2e8f0", false).html;
  assert.match(svg, /#e2e8f0/);
  assert.match(svg, /#020617/);
});

test("Light line and Engineer work line stay in the data but are catalog-hidden", () => {
  const ll = findControlMeasure("110200");
  const ewl = findControlMeasure("110300");
  assert.equal(ll?.catalogHidden, true);
  assert.equal(ewl?.catalogHidden, true);
  assert.equal(findControlMeasure("110100")?.catalogHidden, undefined);
});
