/**
 * MIL-STD-2525D Appendix H — Control Measure **points** (symbol set 25).
 *
 * Entity codes are the 6-digit Set B entity/type/subtype used by milsymbol.
 * `introducedIn` lets 2525E-only rows appear when that standard is selected.
 * Geometry is point (one anchor) for this catalog; lines/areas come later.
 */

import type { SymbologyStandard } from "@/domain/sidc";
import { CONTROL_MEASURE_LINES } from "./controlMeasureLines";

export type ControlMeasureGeometry = "point" | "line";

/**
 * How the line is drawn on the map (points ignore this).
 * `ends` is the generic labelled line; Boundary / maneuver / fires use
 * the 2525 linework styles (`boundary`, `flot`, `phase`, …).
 */
export type ControlMeasureLineDraw =
  | "plain"
  | "ends"
  | "phase"
  | "light"
  | "boundary"
  | "flot"
  | "feba"
  | "arrow"
  | "arrow-double"
  | "arrow-dashed"
  | "ibeam";

export interface ControlMeasureDef {
  /** 6-digit entity code (SIDC digits 11–16). */
  entity: string;
  name: string;
  /** Unique-designation default (Field T), when the standard uses one. */
  abbrev: string;
  group: string;
  geometry: ControlMeasureGeometry;
  introducedIn: SymbologyStandard;
  lineDraw?: ControlMeasureLineDraw;
  /** Kept in the catalog data; omitted from the picker unless searched. */
  catalogHidden?: boolean;
}

export const CONTROL_MEASURE_POINT_GROUPS = [
  "C2 points",
  "Maneuver points",
  "Airspace control points",
  "Fires points",
  "Protection points",
  "Sustainment points",
] as const;

export const CONTROL_MEASURE_POINTS: ControlMeasureDef[] = [
  // Table H-VI Command and Control points
  { entity: "130100", name: "Unspecified control point", abbrev: "", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130200", name: "Amnesty point", abbrev: "AMN", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130300", name: "Checkpoint", abbrev: "CKP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130400", name: "Center of main effort", abbrev: "CME", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130500", name: "Contact point", abbrev: "CONTP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130600", name: "Coordinating point", abbrev: "COORD", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130700", name: "Decision point", abbrev: "DP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130800", name: "Distress call", abbrev: "SOS", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "130900", name: "Entry control point", abbrev: "ECP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131001", name: "Fly-to-point (sonobuoy)", abbrev: "FTP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131002", name: "Fly-to-point (weapon)", abbrev: "FTP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131003", name: "Fly-to-point (normal)", abbrev: "FTP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131100", name: "Linkup point", abbrev: "LU", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131200", name: "Passage point", abbrev: "PP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131300", name: "Point of interest", abbrev: "POI", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131301", name: "Point of interest — launch event", abbrev: "LE", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131400", name: "Rally point", abbrev: "RLY", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131500", name: "Release point", abbrev: "RP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131600", name: "Start point", abbrev: "SP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131700", name: "Special point", abbrev: "", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131800", name: "Waypoint", abbrev: "WPT", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "131900", name: "Airfield", abbrev: "", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "132000", name: "Target handover", abbrev: "", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "132100", name: "Key terrain", abbrev: "KT", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "132200", name: "Control point", abbrev: "CP", group: "C2 points", geometry: "point", introducedIn: "2525D" },
  { entity: "132300", name: "Vital ground", abbrev: "VG", group: "C2 points", geometry: "point", introducedIn: "2525D" },

  // Maneuver points
  { entity: "160100", name: "Observation post / outpost", abbrev: "OP", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160201", name: "Reconnaissance outpost", abbrev: "OP", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160202", name: "Forward observer / spotter", abbrev: "FO", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160203", name: "CBRN observation outpost", abbrev: "OP", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160204", name: "Sensor / listening post", abbrev: "OP", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160205", name: "Combat outpost", abbrev: "COP", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160300", name: "Target reference point", abbrev: "TRP", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },
  { entity: "160400", name: "Point of departure", abbrev: "PD", group: "Maneuver points", geometry: "point", introducedIn: "2525D" },

  // Airspace control points
  { entity: "180100", name: "Air control point", abbrev: "ACP", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180200", name: "Communications checkpoint", abbrev: "CCP", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180300", name: "Downed aircrew pickup point", abbrev: "DAPP", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180400", name: "Pop-up point", abbrev: "PUP", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180500", name: "Air control rendezvous", abbrev: "RZ", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180600", name: "TACAN", abbrev: "TACAN", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180700", name: "CAP station", abbrev: "CAP", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "180800", name: "AEW station", abbrev: "AEW", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "181000", name: "Strike initial point", abbrev: "IP", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "181200", name: "Tanking", abbrev: "TKG", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "181900", name: "Rescue", abbrev: "RSC", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "182000", name: "UAS / UA", abbrev: "UAS", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },
  { entity: "182600", name: "Isolated personnel location", abbrev: "IPL", group: "Airspace control points", geometry: "point", introducedIn: "2525D" },

  // Fires points
  { entity: "240601", name: "Point / single target", abbrev: "", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "240602", name: "Nuclear target", abbrev: "", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "240900", name: "Fire support station", abbrev: "FSS", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "250100", name: "Firing point", abbrev: "FP", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "250200", name: "Hide point", abbrev: "HP", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "250300", name: "Launch point", abbrev: "LP", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "250400", name: "Reload point", abbrev: "RLP", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "250500", name: "Survey control point", abbrev: "SCP", group: "Fires points", geometry: "point", introducedIn: "2525D" },
  { entity: "250600", name: "Known point", abbrev: "KP", group: "Fires points", geometry: "point", introducedIn: "2525D" },

  // Protection points
  { entity: "280200", name: "Antipersonnel mine", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "280300", name: "Antitank mine", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "280600", name: "Unspecified mine", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "280700", name: "Booby trap", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "280800", name: "Engineer regulating point", abbrev: "ERP", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281300", name: "Chemical event", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281400", name: "Biological event", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281500", name: "Nuclear event", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281700", name: "Radiological event", abbrev: "", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281800", name: "Decontamination point / site", abbrev: "DECON", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281801", name: "Alternate decon point / site", abbrev: "DECON", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281802", name: "Decon point (equipment)", abbrev: "DECON", group: "Protection points", geometry: "point", introducedIn: "2525D" },
  { entity: "281803", name: "Decon point (troops)", abbrev: "DECON", group: "Protection points", geometry: "point", introducedIn: "2525D" },

  // Sustainment points
  { entity: "320100", name: "Ambulance exchange point", abbrev: "AXP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320200", name: "Ammunition supply point", abbrev: "ASP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320300", name: "Ammunition transfer point", abbrev: "ATP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320400", name: "Cannibalization point", abbrev: "CAN", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320500", name: "Casualty collection point", abbrev: "CCP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320600", name: "Civilian collection point", abbrev: "CIV", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320700", name: "Detainee collection point", abbrev: "DET", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320800", name: "EPW collection point", abbrev: "EPW", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "320900", name: "Logistics release point", abbrev: "LRP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321000", name: "Maintenance collection point", abbrev: "MCP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321100", name: "MEDEVAC pickup point", abbrev: "MEDEVAC", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321200", name: "Rearm, refuel and resupply point", abbrev: "R3P", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321300", name: "Refuel on the move point", abbrev: "ROM", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321400", name: "Traffic control post", abbrev: "TCP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321500", name: "Trailer transfer point", abbrev: "TTP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321600", name: "Unit maintenance collection point", abbrev: "UMCP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321700", name: "Supply point", abbrev: "SPLY", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321800", name: "Medical supply point", abbrev: "MED", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
  { entity: "321900", name: "Mortuary affairs collection point", abbrev: "MACP", group: "Sustainment points", geometry: "point", introducedIn: "2525D" },
];

export function catalogForStandard(
  standard: SymbologyStandard,
  geometry: ControlMeasureGeometry = "point",
): ControlMeasureDef[] {
  const src =
    geometry === "line" ? CONTROL_MEASURE_LINES : CONTROL_MEASURE_POINTS;
  if (standard === "2525E") return src;
  return src.filter((d) => d.introducedIn === "2525D");
}

export function findControlMeasure(entity: string): ControlMeasureDef | undefined {
  return (
    CONTROL_MEASURE_POINTS.find((d) => d.entity === entity) ??
    CONTROL_MEASURE_LINES.find((d) => d.entity === entity)
  );
}
