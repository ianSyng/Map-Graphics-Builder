/**
 * Combined Linear Target / Smoke / FPF (2525D 240701–240703).
 * milsymbol only draws point-target icons (240601–240603); it has no
 * Linear Target object. We store a center + length + attitude and draw
 * the I-beam as one marker, like a 2525 point.
 */

import type { Graphic, LatLng } from "../types/graphic";
import {
  bearingDeg,
  degToMils,
  destination,
  distanceMeters,
  milsToDeg,
  normalizeHeading,
} from "./geodesy";

export const DEFAULT_LINEAR_TARGET_LENGTH_M = 300;
/** East — matches the 2525 plate (horizontal I-beam). */
export const DEFAULT_LINEAR_TARGET_HEADING_DEG = 90;

export const LINEAR_TARGET_KINDS = [
  { entity: "240701", code: "", label: "—", mark: "" },
  { entity: "240702", code: "smoke", label: "Smoke", mark: "SMOKE" },
  { entity: "240703", code: "fpf", label: "FPF", mark: "FPF" },
] as const;

export const FIRE_SYSTEMS = [
  { code: "", label: "None", mark: "" },
  { code: "artillery", label: "Artillery", mark: "ARTY" },
  { code: "mortar", label: "Mortar", mark: "MORTAR" },
  { code: "ngf", label: "Naval Gunfire", mark: "NGF" },
] as const;

export type FireSystemCode = (typeof FIRE_SYSTEMS)[number]["code"];

export function isLinearTarget(entity: string | undefined): boolean {
  return (
    entity === "240701" || entity === "240702" || entity === "240703"
  );
}

export function isLinearTargetGraphic(g: Graphic): boolean {
  return g.kind === "line" && isLinearTarget(g.symbol?.entity);
}

export function linearTargetKind(entity: string | undefined) {
  return (
    LINEAR_TARGET_KINDS.find((k) => k.entity === entity) ?? {
      entity: "240701",
      code: "",
      label: "—",
      mark: "",
    }
  );
}

export function fireSystemMark(code: string | undefined): string {
  return FIRE_SYSTEMS.find((s) => s.code === code)?.mark ?? "";
}

export function parseFireSystem(raw: string | undefined): FireSystemCode {
  if (!raw) return "";
  const s = raw.trim().toLowerCase();
  if (s === "artillery" || s === "arty" || s === "art") return "artillery";
  if (s === "mortar" || s === "mor") return "mortar";
  if (
    s === "ngf" ||
    s === "naval" ||
    s === "naval gunfire" ||
    s === "naval_gunfire"
  ) {
    return "ngf";
  }
  return FIRE_SYSTEMS.some((x) => x.code === s) ? (s as FireSystemCode) : "";
}

export function linearTargetLengthM(g: Graphic): number {
  return Math.max(1, g.lengthM ?? DEFAULT_LINEAR_TARGET_LENGTH_M);
}

export function linearTargetHeadingDeg(g: Graphic): number {
  return normalizeHeading(g.headingDeg ?? DEFAULT_LINEAR_TARGET_HEADING_DEG);
}

export function linearTargetCenter(g: Graphic): LatLng | null {
  return g.positions[0] ?? null;
}

export function linearTargetEnds(
  center: LatLng,
  lengthM: number,
  headingDeg: number,
): [LatLng, LatLng] {
  const half = Math.max(1, lengthM) / 2;
  const h = normalizeHeading(headingDeg);
  return [
    destination(center, h + 180, half),
    destination(center, h, half),
  ];
}

/** Two endpoints used for drawing, hit-testing, and export. */
export function linearTargetShaft(g: Graphic): LatLng[] | null {
  const c = linearTargetCenter(g);
  if (!c) return null;
  return linearTargetEnds(
    c,
    linearTargetLengthM(g),
    linearTargetHeadingDeg(g),
  );
}

export function lineAttitudeMils(g: Graphic): number {
  return degToMils(linearTargetHeadingDeg(g));
}

export function setLineAttitudeMils(graphic: Graphic, mils: number): Graphic {
  return { ...graphic, headingDeg: milsToDeg(mils) };
}

export function setLinearTargetLength(graphic: Graphic, lengthM: number): Graphic {
  return { ...graphic, lengthM: Math.max(1, lengthM) };
}

/**
 * Collapse a 2-point legacy line (or fill missing length/attitude)
 * into center + lengthM + headingDeg.
 */
export function normalizeLinearTarget(g: Graphic): Graphic {
  if (!isLinearTargetGraphic(g)) return g;
  const a = g.positions[0];
  const b = g.positions[g.positions.length - 1];
  if (g.positions.length >= 2 && a && b && (a[0] !== b[0] || a[1] !== b[1])) {
    const center: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return {
      ...g,
      positions: [center],
      lengthM: g.lengthM ?? Math.max(1, distanceMeters(a, b)),
      headingDeg: g.headingDeg ?? bearingDeg(a, b),
    };
  }
  if (!a) return g;
  return {
    ...g,
    positions: [a],
    lengthM: linearTargetLengthM(g),
    headingDeg: linearTargetHeadingDeg(g),
  };
}
