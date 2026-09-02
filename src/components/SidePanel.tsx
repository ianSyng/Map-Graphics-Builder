import { VerticesEditor } from "@/components/VerticesEditor";
import { findControlMeasure } from "@/catalogs/controlMeasurePoints";
import {
  ECHELONS,
  IDENTITIES,
  STATUSES,
  withSymbolFields,
  type IdentityCode,
  type StatusCode,
} from "@/domain/sidc";
import {
  DEFAULT_LINEAR_TARGET_LENGTH_M,
  FIRE_SYSTEMS,
  LINEAR_TARGET_KINDS,
  isLinearTarget,
  lineAttitudeMils,
  setLineAttitudeMils,
  setLinearTargetLength,
} from "@/lib/linearTarget";
import type { Graphic, LatLng } from "@/types/graphic";

export function SidePanel({
  graphics,
  selected,
  selectedVertexIndex,
  onSelect,
  onUpdate,
  onRemove,
  onSelectVertex,
  onMoveVertex,
  onRemoveVertex,
  onHeading,
  onRectSize,
}: {
  graphics: Graphic[];
  selected: Graphic | null;
  selectedVertexIndex: number | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Graphic>) => void;
  onRemove: (id: string) => void;
  onSelectVertex: (index: number) => void;
  onMoveVertex: (index: number, ll: LatLng) => void;
  onRemoveVertex: (index: number) => void;
  onHeading: (headingDeg: number) => void;
  onRectSize: (patch: { lengthM?: number; widthM?: number }) => void;
}) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Graphics ({graphics.length})
      </div>
      <ul className="max-h-48 overflow-auto border-b border-slate-800">
        {graphics.length === 0 && (
          <li className="px-3 py-4 text-xs text-slate-500">
            No graphics yet. Pick a draw tool and click the map.
          </li>
        )}
        {graphics.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => onSelect(g.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                selected?.id === g.id
                  ? "bg-slate-800 text-amber-200"
                  : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: g.color }}
              />
              <span className="truncate">{g.name}</span>
              <span className="ml-auto text-[10px] uppercase text-slate-500">
                {g.kind === "polygon" ? "area" : g.kind}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Inspector
      </div>
      {!selected ? (
        <p className="px-3 py-4 text-xs text-slate-500">
          Select a graphic to edit geometry, name, and style.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3 overflow-auto p-3 text-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Name
            <input
              value={selected.name}
              onChange={(e) => onUpdate(selected.id, { name: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </label>
          {selected.symbol && (
            <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {findControlMeasure(selected.symbol.entity)?.name ??
                  "Control measure"}
              </div>
              {isLinearTarget(selected.symbol.entity) ? (
                <>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Type
                    <select
                      value={selected.symbol.entity}
                      onChange={(e) => {
                        const entity = e.target.value;
                        const names = new Set(
                          LINEAR_TARGET_KINDS.map(
                            (k) => findControlMeasure(k.entity)?.name ?? "",
                          ),
                        );
                        onUpdate(selected.id, {
                          ...(names.has(selected.name)
                            ? {
                                name:
                                  findControlMeasure(entity)?.name ??
                                  selected.name,
                              }
                            : {}),
                          symbol: withSymbolFields(selected.symbol!, {
                            entity,
                          }),
                        });
                      }}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                    >
                      {LINEAR_TARGET_KINDS.map((k) => (
                        <option key={k.entity} value={k.entity}>
                          {k.label === "—" ? "\u00A0" : k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Unit responsible (T)
                    <input
                      value={selected.symbol.uniqueDesignation ?? ""}
                      onChange={(e) =>
                        onUpdate(selected.id, {
                          symbol: withSymbolFields(selected.symbol!, {
                            uniqueDesignation: e.target.value,
                          }),
                        })
                      }
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    System (V)
                    <select
                      value={selected.symbol.equipmentType ?? ""}
                      onChange={(e) =>
                        onUpdate(selected.id, {
                          symbol: withSymbolFields(selected.symbol!, {
                            equipmentType: e.target.value,
                          }),
                        })
                      }
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                    >
                      {FIRE_SYSTEMS.map((s) => (
                        <option key={s.code || "none"} value={s.code}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Length (m) — target list
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={selected.lengthM ?? DEFAULT_LINEAR_TARGET_LENGTH_M}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        onUpdate(
                          selected.id,
                          setLinearTargetLength(selected, n),
                        );
                      }}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Attitude (mils)
                    <input
                      type="number"
                      min={0}
                      max={6399}
                      step={1}
                      value={lineAttitudeMils(selected)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        onUpdate(
                          selected.id,
                          setLineAttitudeMils(selected, n),
                        );
                      }}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Target number (AP)
                    <input
                      value={selected.symbol.targetNumber ?? ""}
                      onChange={(e) =>
                        onUpdate(selected.id, {
                          name: e.target.value || selected.name,
                          symbol: withSymbolFields(selected.symbol!, {
                            targetNumber: e.target.value,
                          }),
                        })
                      }
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
                    />
                  </label>
                </>
              ) : findControlMeasure(selected.symbol.entity)?.lineDraw ===
                "boundary" ? (
                <>
                  <div className="flex gap-2">
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-400">
                      Unique designation (T1)
                      <input
                        value={selected.symbol.uniqueDesignation ?? ""}
                        onChange={(e) =>
                          onUpdate(selected.id, {
                            name: e.target.value || selected.name,
                            symbol: withSymbolFields(selected.symbol!, {
                              uniqueDesignation: e.target.value,
                            }),
                          })
                        }
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-400">
                      Unique designation (T2)
                      <input
                        value={selected.symbol.uniqueDesignation2 ?? ""}
                        onChange={(e) =>
                          onUpdate(selected.id, {
                            symbol: withSymbolFields(selected.symbol!, {
                              uniqueDesignation2: e.target.value,
                            }),
                          })
                        }
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Echelon (B)
                    <select
                      value={selected.symbol.fieldB ?? ""}
                      onChange={(e) =>
                        onUpdate(selected.id, {
                          symbol: withSymbolFields(selected.symbol!, {
                            fieldB: e.target.value,
                          }),
                        })
                      }
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                    >
                      {ECHELONS.map((e) => (
                        <option key={e.code || "none"} value={e.code}>
                          {e.mark ? `${e.mark} · ${e.label}` : e.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Unique designation (T)
                  <input
                    value={selected.symbol.uniqueDesignation ?? ""}
                    onChange={(e) =>
                      onUpdate(selected.id, {
                        name: e.target.value || selected.name,
                        symbol: withSymbolFields(selected.symbol!, {
                          uniqueDesignation: e.target.value,
                        }),
                      })
                    }
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                  />
                </label>
              )}
              <div className="flex gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-400">
                  Identity
                  <select
                    value={selected.symbol.identity}
                    onChange={(e) =>
                      onUpdate(selected.id, {
                        symbol: withSymbolFields(selected.symbol!, {
                          identity: e.target.value as IdentityCode,
                        }),
                      })
                    }
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                  >
                    {IDENTITIES.map((i) => (
                      <option key={i.code} value={i.code}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-400">
                  Status
                  <select
                    value={selected.symbol.status}
                    onChange={(e) =>
                      onUpdate(selected.id, {
                        symbol: withSymbolFields(selected.symbol!, {
                          status: e.target.value as StatusCode,
                        }),
                      })
                    }
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                DTG (W)
                <input
                  value={selected.symbol.dtg ?? ""}
                  onChange={(e) =>
                    onUpdate(selected.id, {
                      symbol: withSymbolFields(selected.symbol!, {
                        dtg: e.target.value,
                      }),
                    })
                  }
                  placeholder="DDHHMMZMONYY"
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
                />
              </label>
              <div className="font-mono text-[10px] text-slate-500">
                {selected.symbol.standard} · {selected.symbol.sidc}
              </div>
            </div>
          )}
          <VerticesEditor
            graphic={selected}
            selectedVertexIndex={selectedVertexIndex}
            onSelectVertex={onSelectVertex}
            onMoveVertex={onMoveVertex}
            onRemoveVertex={onRemoveVertex}
            onHeading={onHeading}
            onRectSize={onRectSize}
          />
          {!selected.symbol && selected.kind === "circle" && (
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Radius (m)
              <input
                type="number"
                min={1}
                value={selected.radiusM ?? 500}
                onChange={(e) =>
                  onUpdate(selected.id, { radiusM: Number(e.target.value) })
                }
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
            </label>
          )}
          {!selected.symbol && (
          <>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Color
            <input
              type="color"
              value={selected.color}
              onChange={(e) => onUpdate(selected.id, { color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Stroke weight
            <input
              type="range"
              min={1}
              max={8}
              value={selected.weight}
              onChange={(e) =>
                onUpdate(selected.id, { weight: Number(e.target.value) })
              }
            />
          </label>
          {selected.kind !== "line" && selected.kind !== "point" && (
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Fill opacity
              <input
                type="range"
                min={0}
                max={80}
                value={Math.round(selected.fillOpacity * 100)}
                onChange={(e) =>
                  onUpdate(selected.id, {
                    fillOpacity: Number(e.target.value) / 100,
                  })
                }
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Stroke
            <select
              value={selected.dash}
              onChange={(e) =>
                onUpdate(selected.id, {
                  dash: e.target.value as Graphic["dash"],
                })
              }
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </label>
          </>
          )}
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Remarks
            <textarea
              rows={3}
              value={selected.remarks}
              onChange={(e) =>
                onUpdate(selected.id, { remarks: e.target.value })
              }
              className="resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </label>
          <button
            type="button"
            onClick={() => onRemove(selected.id)}
            className="rounded border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950"
          >
            Delete graphic
          </button>
        </form>
      )}
    </aside>
  );
}
