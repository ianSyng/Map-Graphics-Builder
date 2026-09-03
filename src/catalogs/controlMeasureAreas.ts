/**
 * MIL-STD-2525D Appendix H — Control Measure **areas** (symbol set 25).
 *
 * milsymbol does not draw these. Circular: one center + radius (meters).
 * Multi-point: ≥3 vertices. Rectangular variants are omitted for now.
 */

import type { ControlMeasureDef } from "./controlMeasurePoints";

export const CONTROL_MEASURE_AREA_GROUPS = [
  "Fires circular areas",
  "Fires areas",
  "C2 areas",
  "Maneuver areas",
  "Airspace areas",
  "Protection areas",
  "Sustainment areas",
] as const;

function A(
  entity: string,
  name: string,
  abbrev: string,
  group: string,
  areaDraw: "circle" | "polygon",
): ControlMeasureDef {
  return {
    entity,
    name,
    abbrev,
    group,
    geometry: "area",
    introducedIn: "2525D",
    areaDraw,
  };
}

export const CONTROL_MEASURE_AREAS: ControlMeasureDef[] = [
  A("240103", "Airspace coordination area (circular)", "ACA", "Fires circular areas", "circle"),
  A("240203", "Free-fire area (circular)", "FFA", "Fires circular areas", "circle"),
  A("240303", "No-fire area (circular)", "NFA", "Fires circular areas", "circle"),
  A("240403", "Restrictive fire area (circular)", "RFA", "Fires circular areas", "circle"),
  A("240502", "Position area for artillery (circular)", "PAA", "Fires circular areas", "circle"),
  A("240803", "Circular target", "", "Fires circular areas", "circle"),
  A("241003", "Fire support area (circular)", "FSA", "Fires circular areas", "circle"),
  A("241103", "Artillery target intelligence zone (circular)", "ATIZ", "Fires circular areas", "circle"),
  A("241203", "Call for fire area (circular)", "CFFA", "Fires circular areas", "circle"),
  A("241303", "Censor area (circular)", "CENSOR", "Fires circular areas", "circle"),
  A("241403", "Critical friendly zone (circular)", "CFZ", "Fires circular areas", "circle"),
  A("241503", "Dead space area (circular)", "DA", "Fires circular areas", "circle"),
  A("241603", "Sensor zone (circular)", "SENSOR", "Fires circular areas", "circle"),
  A("241703", "Target build-up area (circular)", "TBA", "Fires circular areas", "circle"),
  A("241803", "Target value area (circular)", "TVAR", "Fires circular areas", "circle"),
  A("241903", "Zone of responsibility (circular)", "ZOR", "Fires circular areas", "circle"),
  A("242100", "Weapon / sensor range fan (circular)", "", "Fires circular areas", "circle"),
  A("242303", "Kill box (circular, blue)", "BKB", "Fires circular areas", "circle"),
  A("242306", "Kill box (circular, purple)", "PKB", "Fires circular areas", "circle"),

  A("240101", "Airspace coordination area", "ACA", "Fires areas", "polygon"),
  A("240201", "Free-fire area", "FFA", "Fires areas", "polygon"),
  A("240301", "No-fire area", "NFA", "Fires areas", "polygon"),
  A("240401", "Restrictive fire area", "RFA", "Fires areas", "polygon"),
  A("240801", "Area target", "", "Fires areas", "polygon"),
  A("240805", "Series or group of targets", "", "Fires areas", "polygon"),
  A("241001", "Fire support area", "FSA", "Fires areas", "polygon"),
  A("241101", "Artillery target intelligence zone", "ATIZ", "Fires areas", "polygon"),
  A("241201", "Call for fire area", "CFFA", "Fires areas", "polygon"),
  A("241301", "Censor area", "CENSOR", "Fires areas", "polygon"),
  A("241401", "Critical friendly zone", "CFZ", "Fires areas", "polygon"),
  A("241501", "Dead space area", "DA", "Fires areas", "polygon"),
  A("241601", "Sensor zone", "SENSOR", "Fires areas", "polygon"),
  A("241701", "Target build-up area", "TBA", "Fires areas", "polygon"),
  A("241801", "Target value area", "TVAR", "Fires areas", "polygon"),
  A("241901", "Zone of responsibility", "ZOR", "Fires areas", "polygon"),
  A("242301", "Kill box (blue)", "BKB", "Fires areas", "polygon"),
  A("242304", "Kill box (purple)", "PKB", "Fires areas", "polygon"),

  A("120100", "Area of operations", "AO", "C2 areas", "polygon"),
  A("120200", "Named area of interest", "NAI", "C2 areas", "polygon"),
  A("120300", "Targeted area of interest", "TAI", "C2 areas", "polygon"),
  A("120400", "Airfield zone", "", "C2 areas", "polygon"),

  A("150100", "Area", "", "Maneuver areas", "polygon"),
  A("150200", "Assembly area", "AA", "Maneuver areas", "polygon"),
  A("150600", "Drop zone", "DZ", "Maneuver areas", "polygon"),
  A("150700", "Extraction zone", "EZ", "Maneuver areas", "polygon"),
  A("150800", "Landing zone", "LZ", "Maneuver areas", "polygon"),
  A("150900", "Pick-up zone", "PZ", "Maneuver areas", "polygon"),
  A("151000", "Fortified area", "", "Maneuver areas", "polygon"),
  A("151100", "Limited-access area", "", "Maneuver areas", "polygon"),
  A("151200", "Battle position", "BP", "Maneuver areas", "polygon"),
  A("151300", "Engagement area", "EA", "Maneuver areas", "polygon"),
  A("151500", "Assault position", "ASLT", "Maneuver areas", "polygon"),
  A("151600", "Attack position", "ATK", "Maneuver areas", "polygon"),
  A("151700", "Objective", "OBJ", "Maneuver areas", "polygon"),
  A("151800", "Encirclement", "", "Maneuver areas", "polygon"),
  A("152200", "Search / reconnaissance area", "", "Maneuver areas", "polygon"),

  A("170800", "Base defense zone", "BDZ", "Airspace areas", "polygon"),
  A("170900", "High-density airspace control zone", "HIDACZ", "Airspace areas", "polygon"),
  A("171000", "Restricted operations zone", "ROZ", "Airspace areas", "polygon"),
  A("171100", "Air-to-air restricted operating zone", "AAROZ", "Airspace areas", "polygon"),
  A("171200", "Unmanned aircraft restricted operating zone", "UAROZ", "Airspace areas", "polygon"),
  A("171300", "Weapon engagement zone", "WEZ", "Airspace areas", "polygon"),
  A("171400", "Fighter engagement zone", "FEZ", "Airspace areas", "polygon"),
  A("171500", "Joint engagement zone", "JEZ", "Airspace areas", "polygon"),
  A("171600", "Missile engagement zone", "MEZ", "Airspace areas", "polygon"),
  A("171700", "Low-altitude missile engagement zone", "LOMEZ", "Airspace areas", "polygon"),
  A("171800", "High-altitude missile engagement zone", "HIMEZ", "Airspace areas", "polygon"),
  A("171900", "Short-range air defense engagement zone", "SHORADEZ", "Airspace areas", "polygon"),
  A("172000", "Weapons free zone", "WFZ", "Airspace areas", "polygon"),

  A("270100", "Obstacle belt", "", "Protection areas", "polygon"),
  A("270200", "Obstacle zone", "", "Protection areas", "polygon"),
  A("270300", "Obstacle-free zone", "", "Protection areas", "polygon"),
  A("270400", "Obstacle-restricted zone", "", "Protection areas", "polygon"),
  A("270800", "Mined area", "", "Protection areas", "polygon"),
  A("271000", "Unexploded explosive ordnance area", "UXO", "Protection areas", "polygon"),
  A("271700", "Biological contaminated area", "", "Protection areas", "polygon"),
  A("271800", "Chemical contaminated area", "", "Protection areas", "polygon"),
  A("271900", "Nuclear contaminated area", "", "Protection areas", "polygon"),
  A("272000", "Radiological contaminated area", "", "Protection areas", "polygon"),
  A("272100", "Minimum safe distance zone", "MSD", "Protection areas", "circle"),

  A("310100", "Detainee holding area", "DET", "Sustainment areas", "polygon"),
  A("310200", "EPW holding area", "EPW", "Sustainment areas", "polygon"),
  A("310300", "Forward arming and refueling point", "FARP", "Sustainment areas", "polygon"),
  A("310400", "Refugee holding area", "REFUGEE", "Sustainment areas", "polygon"),
  A("310500", "Regimental support area", "RSA", "Sustainment areas", "polygon"),
  A("310600", "Brigade support area", "BSA", "Sustainment areas", "polygon"),
  A("310700", "Division support area", "DSA", "Sustainment areas", "polygon"),
];
