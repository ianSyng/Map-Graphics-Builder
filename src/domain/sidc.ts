/**
 * Numeric SIDC (MIL-STD-2525D/E, 20 digits).
 *
 * Digit layout (2525D Appendix A / 2525E compatible):
 *  1–2  version        10 = 2525D, 11 = 2525E
 *  3–4  standard identity (context + identity)
 *  5–6  symbol set     25 = Control Measure
 *  7    status         0 present, 1 planned/anticipated
 *  8    HQ / TF / dummy
 *  9–10 amplifier
 * 11–16 entity / type / subtype
 * 17–18 sector 1 modifier
 * 19–20 sector 2 modifier
 *
 * 2525E reuses this layout; new symbols are extra entity codes.
 * Swap `standard` to emit version `11` without changing catalogs.
 */

export type SymbologyStandard = "2525D" | "2525E";

export const STANDARD_VERSION: Record<SymbologyStandard, string> = {
  "2525D": "10",
  "2525E": "11",
};

export const SYMBOL_SET_CONTROL_MEASURE = "25";

export const IDENTITIES = [
  { code: "00", label: "Pending" },
  { code: "01", label: "Unknown" },
  { code: "03", label: "Friend" },
  { code: "04", label: "Neutral" },
  { code: "06", label: "Hostile" },
] as const;

export type IdentityCode = (typeof IDENTITIES)[number]["code"];

export const STATUSES = [
  { code: "0", label: "Present" },
  { code: "1", label: "Planned" },
] as const;

export type StatusCode = (typeof STATUSES)[number]["code"];

/** Field B — echelon / size mark drawn on a boundary (SIDC digits 9–10). */
export const ECHELONS = [
  { code: "", label: "None", mark: "" },
  { code: "11", label: "Team / crew", mark: "Ø" },
  { code: "12", label: "Squad", mark: "●" },
  { code: "13", label: "Section", mark: "●●" },
  { code: "14", label: "Platoon", mark: "●●●" },
  { code: "15", label: "Company / battery / troop", mark: "I" },
  { code: "16", label: "Battalion / squadron", mark: "II" },
  { code: "17", label: "Regiment / group", mark: "III" },
  { code: "18", label: "Brigade", mark: "X" },
  { code: "21", label: "Division", mark: "XX" },
  { code: "22", label: "Corps / MEF", mark: "XXX" },
  { code: "23", label: "Army", mark: "XXXX" },
  { code: "24", label: "Army group / front", mark: "XXXXX" },
  { code: "25", label: "Region / theater", mark: "XXXXXX" },
] as const;

export type EchelonCode = (typeof ECHELONS)[number]["code"];

export function echelonMark(code: string | undefined): string {
  return ECHELONS.find((e) => e.code === code)?.mark ?? "";
}

export interface SidcParts {
  standard: SymbologyStandard;
  identity: string;
  symbolSet: string;
  status: string;
  hq: string;
  amplifier: string;
  entity: string;
  modifier1: string;
  modifier2: string;
}

export interface GraphicSymbol {
  standard: SymbologyStandard;
  symbolSet: string;
  entity: string;
  identity: string;
  status: string;
  uniqueDesignation?: string;
  /** Field T2 — second unique designation (adjacent unit on a boundary). */
  uniqueDesignation2?: string;
  additionalInformation?: string;
  dtg?: string;
  /** Field B — echelon / size mark at the center of a boundary. */
  fieldB?: string;
  /** Field AP — target number (linear / point targets). */
  targetNumber?: string;
  /** Field V — type of equipment (e.g. artillery, mortar, NGF). */
  equipmentType?: string;
  /** Always 20 digits; derived from the fields above. */
  sidc: string;
}

function pad(value: string, n: number): string {
  return value.replace(/\D/g, "").padStart(n, "0").slice(0, n);
}

export function composeSidc(parts: Omit<SidcParts, never> | GraphicSymbol): string {
  const standard: SymbologyStandard =
    "standard" in parts && (parts.standard === "2525D" || parts.standard === "2525E")
      ? parts.standard
      : "2525D";
  const version = STANDARD_VERSION[standard];
  const identity = pad(parts.identity || "03", 2);
  const symbolSet = pad(parts.symbolSet || SYMBOL_SET_CONTROL_MEASURE, 2);
  const status = pad(parts.status || "0", 1);
  const hq = pad("hq" in parts ? String(parts.hq ?? "0") : "0", 1);
  const amplifier = pad("amplifier" in parts ? String(parts.amplifier ?? "00") : "00", 2);
  const entity = pad(parts.entity, 6);
  const modifier1 = pad("modifier1" in parts ? String(parts.modifier1 ?? "00") : "00", 2);
  const modifier2 = pad("modifier2" in parts ? String(parts.modifier2 ?? "00") : "00", 2);
  return `${version}${identity}${symbolSet}${status}${hq}${amplifier}${entity}${modifier1}${modifier2}`;
}

export function parseSidc(sidc: string): SidcParts | null {
  const s = sidc.replace(/\s/g, "");
  if (!/^\d{20}$/.test(s)) return null;
  const version = s.slice(0, 2);
  const standard: SymbologyStandard = version === "11" ? "2525E" : "2525D";
  return {
    standard,
    identity: s.slice(2, 4),
    symbolSet: s.slice(4, 6),
    status: s.slice(6, 7),
    hq: s.slice(7, 8),
    amplifier: s.slice(8, 10),
    entity: s.slice(10, 16),
    modifier1: s.slice(16, 18),
    modifier2: s.slice(18, 20),
  };
}

export function makeSymbol(input: {
  standard: SymbologyStandard;
  entity: string;
  identity?: string;
  status?: string;
  uniqueDesignation?: string;
  uniqueDesignation2?: string;
  additionalInformation?: string;
  dtg?: string;
  fieldB?: string;
  targetNumber?: string;
  equipmentType?: string;
  symbolSet?: string;
}): GraphicSymbol {
  const fieldB = input.fieldB || "";
  const parts: SidcParts = {
    standard: input.standard,
    identity: input.identity ?? "03",
    symbolSet: input.symbolSet ?? SYMBOL_SET_CONTROL_MEASURE,
    status: input.status ?? "0",
    hq: "0",
    amplifier: fieldB || "00",
    entity: input.entity,
    modifier1: "00",
    modifier2: "00",
  };
  return {
    standard: parts.standard,
    symbolSet: parts.symbolSet,
    entity: parts.entity,
    identity: parts.identity,
    status: parts.status,
    uniqueDesignation: input.uniqueDesignation,
    uniqueDesignation2: input.uniqueDesignation2,
    additionalInformation: input.additionalInformation,
    dtg: input.dtg,
    fieldB: fieldB || undefined,
    targetNumber: input.targetNumber,
    equipmentType: input.equipmentType,
    sidc: composeSidc(parts),
  };
}

export function withSymbolFields(
  symbol: GraphicSymbol,
  patch: Partial<
    Pick<
      GraphicSymbol,
      | "standard"
      | "identity"
      | "status"
      | "entity"
      | "uniqueDesignation"
      | "uniqueDesignation2"
      | "additionalInformation"
      | "dtg"
      | "fieldB"
      | "targetNumber"
      | "equipmentType"
    >
  >,
): GraphicSymbol {
  return makeSymbol({
    standard: patch.standard ?? symbol.standard,
    entity: patch.entity ?? symbol.entity,
    identity: patch.identity ?? symbol.identity,
    status: patch.status ?? symbol.status,
    uniqueDesignation: patch.uniqueDesignation ?? symbol.uniqueDesignation,
    uniqueDesignation2:
      patch.uniqueDesignation2 !== undefined
        ? patch.uniqueDesignation2
        : symbol.uniqueDesignation2,
    additionalInformation:
      patch.additionalInformation ?? symbol.additionalInformation,
    dtg: patch.dtg ?? symbol.dtg,
    fieldB: patch.fieldB !== undefined ? patch.fieldB : symbol.fieldB,
    targetNumber:
      patch.targetNumber !== undefined
        ? patch.targetNumber
        : symbol.targetNumber,
    equipmentType:
      patch.equipmentType !== undefined
        ? patch.equipmentType
        : symbol.equipmentType,
    symbolSet: symbol.symbolSet,
  });
}
