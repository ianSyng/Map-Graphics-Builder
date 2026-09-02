import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arrowHead,
  boundaryLabelAxis,
  decorationScale,
  flotScallops,
  labelRotationDeg,
  pathLengthM,
  pointAlongPath,
  samplePath,
  tCapSegment,
  phaseEndLabelLayout,
} from "./cmLineGeom";
import type { LatLng } from "../types/graphic";

const east: LatLng[] = [
  [39, -98],
  [39, -97],
];

test("path length is positive along an east-west segment", () => {
  assert.ok(pathLengthM(east) > 10_000);
});

test("T-cap is perpendicular to an eastbound line", () => {
  const cap = tCapSegment(east[0]!, 90, 100);
  assert.equal(cap.length, 2);
  const dLat = Math.abs((cap[0]![0] ?? 0) - (cap[1]![0] ?? 0));
  const dLng = Math.abs((cap[0]![1] ?? 0) - (cap[1]![1] ?? 0));
  assert.ok(dLat > dLng, "tick should run north-south");
});

test("FLOT scallops are arcs with several vertices", () => {
  const bumps = flotScallops(east, 20_000, 400);
  assert.ok(bumps.length >= 1);
  assert.ok((bumps[0]?.length ?? 0) >= 5);
});

test("arrow head is a triangle pointing along bearing", () => {
  const head = arrowHead(east[1]!, 90, 500, 250);
  assert.equal(head.length, 3);
  assert.equal(head[0]![0], east[1]![0]);
  assert.equal(head[0]![1], east[1]![1]);
});

test("label rotation stays readable on east and west lines", () => {
  assert.equal(labelRotationDeg(90), 0);
  assert.equal(labelRotationDeg(270), 0);
});

test("phase-line labels sit left of the left end and right of the right end", () => {
  const lr = phaseEndLabelLayout({ x: 10, y: 20 }, { x: 80, y: 22 }, 10);
  assert.equal(lr.start.align, "end");
  assert.equal(lr.start.dx, -10);
  assert.equal(lr.end.align, "start");
  assert.equal(lr.end.dx, 10);
  const rl = phaseEndLabelLayout({ x: 80, y: 20 }, { x: 10, y: 22 }, 10);
  assert.equal(rl.start.align, "start");
  assert.equal(rl.end.align, "end");
});

test("boundary T placement flips at 45° from horizontal", () => {
  assert.equal(boundaryLabelAxis(90), "ns");
  assert.equal(boundaryLabelAxis(270), "ns");
  assert.equal(boundaryLabelAxis(45), "ns");
  assert.equal(boundaryLabelAxis(0), "ew");
  assert.equal(boundaryLabelAxis(180), "ew");
  assert.equal(boundaryLabelAxis(44), "ew");
});

test("pointAlongPath hits start, mid, and end", () => {
  const a = pointAlongPath(east, 0);
  const b = pointAlongPath(east, 1);
  assert.ok(a && b);
  assert.equal(a.at[0], east[0]![0]);
  assert.equal(b.at[1], east[1]![1]);
});

test("samplePath respects spacing", () => {
  const samples = samplePath(east, decorationScale(east).spacingM);
  assert.ok(samples.length >= 1);
  for (const s of samples) {
    assert.ok(Number.isFinite(s.bearing));
  }
});
