import assert from "node:assert/strict";
import { test } from "node:test";
import { findControlMeasure } from "../catalogs/controlMeasurePoints";
import { makeSymbol, withSymbolFields } from "../domain/sidc";
import { linearTargetSvg } from "./linearTargetSvg";
import { degToMils, milsToDeg } from "./geodesy";
import {
  DEFAULT_LINEAR_TARGET_LENGTH_M,
  fireSystemMark,
  isLinearTarget,
  lineAttitudeMils,
  linearTargetKind,
  linearTargetLengthM,
  normalizeLinearTarget,
  parseFireSystem,
  setLineAttitudeMils,
  setLinearTargetLength,
} from "./linearTarget";
import type { Graphic } from "../types/graphic";

test("linear target family is one picker row; smoke and FPF stay in data", () => {
  assert.equal(findControlMeasure("240701")?.catalogHidden, undefined);
  assert.equal(findControlMeasure("240701")?.lineDraw, "ibeam");
  assert.equal(findControlMeasure("240702")?.catalogHidden, true);
  assert.equal(findControlMeasure("240703")?.catalogHidden, true);
  assert.equal(findControlMeasure("240702")?.lineDraw, "ibeam");
});

test("type choice maps to 240701 / 240702 / 240703", () => {
  assert.equal(linearTargetKind("240701").mark, "");
  assert.equal(linearTargetKind("240702").mark, "SMOKE");
  assert.equal(linearTargetKind("240703").mark, "FPF");
  assert.equal(isLinearTarget("240701"), true);
  assert.equal(isLinearTarget("140300"), false);
});

test("Field V systems are Artillery, Mortar, Naval Gunfire", () => {
  assert.equal(fireSystemMark("artillery"), "ARTY");
  assert.equal(fireSystemMark("mortar"), "MORTAR");
  assert.equal(fireSystemMark("ngf"), "NGF");
  assert.equal(fireSystemMark(""), "");
  assert.equal(parseFireSystem("Naval Gunfire"), "ngf");
  assert.equal(parseFireSystem("ARTY"), "artillery");
});

test("switching type updates SIDC entity; AP and T are preserved", () => {
  const s = makeSymbol({
    standard: "2525D",
    entity: "240701",
    targetNumber: "LA2961",
    uniqueDesignation: "12 IN BN",
    equipmentType: "mortar",
  });
  assert.equal(s.sidc.slice(10, 16), "240701");
  const fpf = withSymbolFields(s, { entity: "240703" });
  assert.equal(fpf.sidc.slice(10, 16), "240703");
  assert.equal(fpf.targetNumber, "LA2961");
  assert.equal(fpf.uniqueDesignation, "12 IN BN");
  assert.equal(fpf.equipmentType, "mortar");
});

test("NATO mils: 90° is 1600, 6400 wraps to 0", () => {
  assert.equal(degToMils(0), 0);
  assert.equal(degToMils(90), 1600);
  assert.equal(degToMils(180), 3200);
  assert.equal(degToMils(360), 0);
  assert.equal(Math.round(milsToDeg(1600)), 90);
});

function stubLinear(positions: Graphic["positions"], extra: Partial<Graphic> = {}): Graphic {
  return {
    id: "lt",
    name: "Linear target",
    kind: "line",
    color: "#7dd3fc",
    fillOpacity: 0,
    weight: 3,
    dash: "solid",
    positions,
    remarks: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    symbol: makeSymbol({ standard: "2525D", entity: "240701" }),
    ...extra,
  };
}

test("linear target is center + length (default 300 m) + attitude", () => {
  const g = stubLinear([[39, -98]]);
  assert.equal(linearTargetLengthM(g), DEFAULT_LINEAR_TARGET_LENGTH_M);
  assert.equal(DEFAULT_LINEAR_TARGET_LENGTH_M, 300);
  const g300 = { ...g, lengthM: 300, headingDeg: 90 };
  assert.equal(lineAttitudeMils(g300), 1600);
});

test("legacy two-point linear target collapses to center + length + heading", () => {
  const g = stubLinear([
    [39, -98],
    [39, -97],
  ]);
  const n = normalizeLinearTarget(g);
  assert.equal(n.positions.length, 1);
  assert.ok((n.lengthM ?? 0) > 1000);
  assert.equal(lineAttitudeMils(n), 1600);
});

test("linear target SVG icon includes AP, type, T, and V", () => {
  const g = stubLinear([[39, -98]], {
    lengthM: 300,
    headingDeg: 90,
    symbol: makeSymbol({
      standard: "2525D",
      entity: "240703",
      targetNumber: "QC1968",
      uniqueDesignation: "12 IN BN",
      equipmentType: "mortar",
    }),
  });
  const html = linearTargetSvg(g, "#7dd3fc", false).html;
  assert.match(html, /QC1968/);
  assert.match(html, /FPF/);
  assert.match(html, /12 IN BN/);
  assert.match(html, /MORTAR/);
});

test("attitude mils writes headingDeg without moving the center", () => {
  const g = stubLinear([[39, -98]], { lengthM: 300, headingDeg: 90 });
  const north = setLineAttitudeMils(g, 0);
  assert.equal(north.positions[0]![0], 39);
  assert.equal(north.positions[0]![1], -98);
  assert.equal(lineAttitudeMils(north), 0);
  const longer = setLinearTargetLength(g, 500);
  assert.equal(longer.lengthM, 500);
  assert.equal(longer.positions[0]![0], 39);
});
