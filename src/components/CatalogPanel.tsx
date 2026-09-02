import { useMemo, useState } from "react";
import {
  catalogForStandard,
  CONTROL_MEASURE_POINT_GROUPS,
  type ControlMeasureDef,
  type ControlMeasureGeometry,
} from "@/catalogs/controlMeasurePoints";
import { CONTROL_MEASURE_LINE_GROUPS } from "@/catalogs/controlMeasureLines";
import { CatalogIcon, LineCatalogIcon } from "@/components/CatalogIcon";
import { cmStrokeColor } from "@/lib/cmLine";
import {
  IDENTITIES,
  STATUSES,
  makeSymbol,
  type IdentityCode,
  type StatusCode,
  type SymbologyStandard,
} from "@/domain/sidc";

export function CatalogPanel({
  standard,
  identity,
  status,
  selectedEntity,
  geometry,
  onStandard,
  onIdentity,
  onStatus,
  onSelect,
}: {
  standard: SymbologyStandard;
  identity: string;
  status: string;
  selectedEntity: string | null;
  geometry: ControlMeasureGeometry;
  onStandard: (s: SymbologyStandard) => void;
  onIdentity: (c: IdentityCode) => void;
  onStatus: (c: StatusCode) => void;
  onSelect: (def: ControlMeasureDef) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogForStandard(standard, geometry).filter((d) => {
      const matches =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.abbrev.toLowerCase().includes(q) ||
        d.entity.includes(q) ||
        d.group.toLowerCase().includes(q);
      if (!matches) return false;
      if (d.catalogHidden && !q) return false;
      return true;
    });
  }, [standard, query, geometry]);

  const searching = query.trim().length > 0;

  function isOpen(group: string): boolean {
    if (searching) return true;
    return open[group] === true;
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Appendix H · {geometry === "line" ? "Lines" : "Points"}
      </div>
      <div className="flex flex-col gap-2 border-b border-slate-800 p-2">
        <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wide text-slate-500">
          Standard
          <select
            value={standard}
            onChange={(e) => onStandard(e.target.value as SymbologyStandard)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          >
            <option value="2525D">MIL-STD-2525D</option>
            <option value="2525E">MIL-STD-2525E</option>
          </select>
        </label>
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-[10px] uppercase tracking-wide text-slate-500">
            Identity
            <select
              value={identity}
              onChange={(e) => onIdentity(e.target.value as IdentityCode)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            >
              {IDENTITIES.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-[10px] uppercase tracking-wide text-slate-500">
            Status
            <select
              value={status}
              onChange={(e) => onStatus(e.target.value as StatusCode)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            >
              {STATUSES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={geometry === "line" ? "Search lines…" : "Search points…"}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
        />
        {geometry === "line" && (
          <p className="text-[10px] leading-snug text-slate-500">
            2525 linework is in for Boundary, maneuver, and fires. Other groups
            are labelled stubs until we take them in turn.
          </p>
        )}
        {standard === "2525E" && (
          <p className="text-[10px] leading-snug text-amber-200/80">
            2525E uses version digit 11. Codes are the 2525D set until an E
            catalog is added.
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1">
        {(geometry === "line"
          ? CONTROL_MEASURE_LINE_GROUPS
          : CONTROL_MEASURE_POINT_GROUPS
        ).map((group) => {
          const items = rows.filter((d) => d.group === group);
          if (items.length === 0) return null;
          const expanded = isOpen(group);
          return (
            <div key={group} className="mb-1">
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) => ({ ...prev, [group]: !expanded }))
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                aria-expanded={expanded}
              >
                <span className="inline-block w-3 text-slate-500">
                  {expanded ? "▾" : "▸"}
                </span>
                <span className="flex-1">{group}</span>
                <span className="font-mono text-[10px] font-normal text-slate-600">
                  {items.length}
                </span>
              </button>
              {expanded &&
                items.map((d) => {
                  const active = selectedEntity === d.entity;
                  const previewSidc =
                    geometry === "point"
                      ? makeSymbol({
                          standard,
                          entity: d.entity,
                          identity,
                          status,
                        }).sidc
                      : "";
                  return (
                    <button
                      key={d.entity}
                      type="button"
                      onClick={() => onSelect(d)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                        active
                          ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/40"
                          : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      {geometry === "line" ? (
                        <LineCatalogIcon
                          abbrev={d.abbrev}
                          color={cmStrokeColor(identity)}
                          draw={d.lineDraw}
                        />
                      ) : (
                        <CatalogIcon sidc={previewSidc} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{d.name}</span>
                        <span className="block font-mono text-[10px] text-slate-500">
                          {d.abbrev ? `${d.abbrev} · ` : ""}
                          {d.entity}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
