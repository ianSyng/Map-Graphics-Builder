import assert from "node:assert/strict";
import { test } from "node:test";
import { composeSidc, echelonMark, makeSymbol, parseSidc, withSymbolFields } from "./sidc";

test("composes a 20-digit 2525D control-measure SIDC", () => {
  const sidc = composeSidc({
    standard: "2525D",
    identity: "03",
    symbolSet: "25",
    status: "0",
    hq: "0",
    amplifier: "00",
    entity: "130300",
    modifier1: "00",
    modifier2: "00",
  });
  assert.equal(sidc.length, 20);
  assert.equal(sidc, "10032500001303000000");
  assert.equal(sidc.slice(4, 6), "25");
  assert.equal(sidc.slice(10, 16), "130300");
});

test("2525E uses version 11 without changing the entity", () => {
  const d = makeSymbol({ standard: "2525D", entity: "131400", identity: "03" });
  const e = makeSymbol({ standard: "2525E", entity: "131400", identity: "03" });
  assert.equal(d.sidc.slice(0, 2), "10");
  assert.equal(e.sidc.slice(0, 2), "11");
  assert.equal(d.sidc.slice(2), e.sidc.slice(2));
});

test("parseSidc round-trips", () => {
  const made = makeSymbol({
    standard: "2525D",
    entity: "131800",
    identity: "06",
    status: "1",
  });
  const parsed = parseSidc(made.sidc);
  assert.ok(parsed);
  assert.equal(parsed?.standard, "2525D");
  assert.equal(parsed?.identity, "06");
  assert.equal(parsed?.status, "1");
  assert.equal(parsed?.entity, "131800");
  assert.equal(parsed?.symbolSet, "25");
});

test("boundary Field B is centered amplifier; T1/T2 are preserved", () => {
  const s = makeSymbol({
    standard: "2525D",
    entity: "110100",
    uniqueDesignation: "1ID",
    uniqueDesignation2: "2AD",
    fieldB: "21",
  });
  assert.equal(s.fieldB, "21");
  assert.equal(s.uniqueDesignation, "1ID");
  assert.equal(s.uniqueDesignation2, "2AD");
  assert.equal(s.sidc.slice(8, 10), "21");
  assert.equal(echelonMark("21"), "XX");
  const patched = withSymbolFields(s, { fieldB: "18" });
  assert.equal(patched.fieldB, "18");
  assert.equal(patched.uniqueDesignation2, "2AD");
});

test("Field AP and V persist when other amplifiers change", () => {
  const s = makeSymbol({
    standard: "2525D",
    entity: "240701",
    targetNumber: "QC1968",
    equipmentType: "artillery",
  });
  assert.equal(s.targetNumber, "QC1968");
  assert.equal(s.equipmentType, "artillery");
  const patched = withSymbolFields(s, { uniqueDesignation: "A BTRY" });
  assert.equal(patched.targetNumber, "QC1968");
  assert.equal(patched.equipmentType, "artillery");
  assert.equal(patched.uniqueDesignation, "A BTRY");
});
