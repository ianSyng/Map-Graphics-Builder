import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogPanel } from "@/components/CatalogPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppHeader } from "@/components/AppHeader";
import { ClientMap } from "@/components/ClientMap";
import { SidePanel } from "@/components/SidePanel";
import { ToolRail } from "@/components/ToolRail";
import { findControlMeasure } from "@/catalogs/controlMeasurePoints";
import {
  DEFAULT_LINEAR_TARGET_HEADING_DEG,
  DEFAULT_LINEAR_TARGET_LENGTH_M,
  isLinearTarget,
} from "@/lib/linearTarget";
import { cmStrokeColor } from "@/lib/cmLine";
import {
  makeSymbol,
  type IdentityCode,
  type StatusCode,
  type SymbologyStandard,
} from "@/domain/sidc";
import { useGraphicsStore } from "@/hooks/useGraphicsStore";
import type { FitRequest } from "@/components/MapView";
import { distanceM } from "@/lib/geo";
import { normalizeHeading } from "@/lib/geodesy";
import { importFromFile, isLikelyImportFile } from "@/lib/io";
import { cornersFromRect, rectFromDrag } from "@/lib/rectangle";
import type { DrawTool, LatLng } from "@/types/graphic";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export default function App() {
  const store = useGraphicsStore();
  const [fitRequest, setFitRequest] = useState<FitRequest | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hoverRef = useRef<LatLng | null>(null);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [standard, setStandard] = useState<SymbologyStandard>("2525D");
  const [identity, setIdentity] = useState<IdentityCode>("03");
  const [status, setStatus] = useState<StatusCode>("0");
  const [cmEntity, setCmEntity] = useState<string | null>("130300");
  const [cmLineEntity, setCmLineEntity] = useState<string | null>("140300");

  const cancelDraft = useCallback(() => {
    store.setDraft([]);
    hoverRef.current = null;
  }, [store]);

  const finishDraft = useCallback(() => {
    const { tool, draft } = store;
    if ((tool === "line" || tool === "cm-line") && draft.length >= 2) {
      if (tool === "cm-line") {
        if (!cmLineEntity) return;
        const def = findControlMeasure(cmLineEntity);
        if (!def) return;
        const symbol = makeSymbol({
          standard,
          entity: def.entity,
          identity,
          status,
        });
        store.addGraphic("line", draft, {
          symbol,
          name: def.abbrev || def.name,
          color: cmStrokeColor(identity),
          dash: status === "1" ? "dashed" : "solid",
          weight: 3,
          stayOnTool: true,
        });
        return;
      }
      store.addGraphic("line", draft);
      return;
    }
    if (tool === "polygon" && draft.length >= 3) {
      store.addGraphic("polygon", draft);
    }
    if (tool === "rectangle" && draft[0] && (draft[1] || hoverRef.current)) {
      const b = draft[1] ?? hoverRef.current;
      if (!b) return;
      const rect = rectFromDrag(draft[0], b, headingDeg);
      store.addGraphic("rectangle", cornersFromRect(rect), {
        headingDeg: rect.headingDeg,
      });
    }
  }, [store, headingDeg, cmLineEntity, standard, identity, status]);

  const onTool = useCallback(
    (t: DrawTool) => {
      store.setDraft([]);
      hoverRef.current = null;
      store.setTool(t);
      if (t !== "select") store.selectGraphic(null);
    },
    [store],
  );

  const onMapClick = useCallback(
    (ll: LatLng) => {
      const { tool, draft } = store;
      if (tool === "select") return;
      if (tool === "cm-point") {
        if (!cmEntity) return;
        const def = findControlMeasure(cmEntity);
        if (!def) return;
        const symbol = makeSymbol({
          standard,
          entity: def.entity,
          identity,
          status,
          uniqueDesignation: def.abbrev || undefined,
        });
        store.addGraphic("point", [ll], {
          symbol,
          name: def.abbrev || def.name,
          stayOnTool: true,
        });
        return;
      }
      if (tool === "point") {
        store.addGraphic("point", [ll]);
        return;
      }
      if (tool === "cm-line" && isLinearTarget(cmLineEntity ?? undefined)) {
        if (!cmLineEntity) return;
        const def = findControlMeasure(cmLineEntity);
        if (!def) return;
        const symbol = makeSymbol({
          standard,
          entity: def.entity,
          identity,
          status,
        });
        store.addGraphic("line", [ll], {
          symbol,
          name: def.abbrev || def.name,
          color: cmStrokeColor(identity),
          dash: status === "1" ? "dashed" : "solid",
          weight: 3,
          headingDeg: DEFAULT_LINEAR_TARGET_HEADING_DEG,
          lengthM: DEFAULT_LINEAR_TARGET_LENGTH_M,
          stayOnTool: true,
        });
        return;
      }
      if (tool === "circle") {
        if (draft.length === 0) {
          store.setDraft([ll]);
          return;
        }
        store.addGraphic("circle", [draft[0]], {
          radiusM: Math.max(1, distanceM(draft[0], ll)),
        });
        return;
      }
      if (tool === "rectangle") {
        if (draft.length === 0) {
          store.setDraft([ll]);
          return;
        }
        const origin = draft[0];
        if (!origin) return;
        if (draft.length === 1) {
          store.setDraft([origin, ll]);
          return;
        }
        const b = draft[1] ?? ll;
        const rect = rectFromDrag(origin, b, headingDeg);
        store.addGraphic("rectangle", cornersFromRect(rect), {
          headingDeg: rect.headingDeg,
        });
        return;
      }
      store.setDraft((prev) => [...prev, ll]);
    },
    [store, headingDeg, cmEntity, cmLineEntity, standard, identity, status],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        cancelDraft();
        store.setTool("select");
      }
      if (e.key === "Enter") finishDraft();
      if (store.tool === "rectangle") {
        const step = e.shiftKey ? 15 : 5;
        if (e.key === "ArrowLeft" || e.key === "[") {
          e.preventDefault();
          setHeadingDeg((h) => normalizeHeading(h - step));
        }
        if (e.key === "ArrowRight" || e.key === "]") {
          e.preventDefault();
          setHeadingDeg((h) => normalizeHeading(h + step));
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.selected && store.selectedVertexIndex != null) {
          e.preventDefault();
          store.removeVertex(store.selected.id, store.selectedVertexIndex);
          return;
        }
        if (e.key === "Delete" && store.selected) {
          e.preventDefault();
          store.removeGraphic(store.selected.id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelDraft, finishDraft, store]);

  const importFile = useCallback(
    async (file: File) => {
      const result = await importFromFile(file);
      if (!result.ok) {
        setImportStatus(result.error);
        return;
      }
      if (result.graphics.length === 0) {
        setImportStatus(
          result.skipped > 0
            ? `No usable features (${result.skipped} skipped).`
            : "No features in that file.",
        );
        return;
      }
      store.appendGraphics(result.graphics);
      setFitRequest({ nonce: Date.now(), graphics: result.graphics });
      const extra =
        result.skipped > 0 ? ` · ${result.skipped} skipped` : "";
      const n = result.graphics.length;
      setImportStatus(`Imported ${n} graphic${n === 1 ? "" : "s"}${extra}.`);
    },
    [store],
  );

  useEffect(() => {
    if (!importStatus) return;
    const t = window.setTimeout(() => setImportStatus(null), 6000);
    return () => window.clearTimeout(t);
  }, [importStatus]);

  const canFinish =
    ((store.tool === "line" || store.tool === "cm-line") &&
      store.draft.length >= 2) ||
    (store.tool === "polygon" && store.draft.length >= 3) ||
    (store.tool === "rectangle" && store.draft.length >= 2);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-slate-950 text-slate-100"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!isLikelyImportFile(file)) {
          setImportStatus("Drop a GeoJSON, KML, KMZ, or CSV file.");
          return;
        }
        void importFile(file);
      }}
    >
      <AppHeader
        graphics={store.graphics}
        status={importStatus}
        onImportFile={(file) => void importFile(file)}
        onClear={store.clearAll}
      />
      <div className="flex min-h-0 flex-1">
        <ToolRail
          tool={store.tool}
          onTool={onTool}
          onFinish={finishDraft}
          onCancel={cancelDraft}
          canFinish={canFinish}
          headingDeg={headingDeg}
        />
        {(store.tool === "cm-point" || store.tool === "cm-line") && (
          <ErrorBoundary
            fallback={
              <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 p-3 text-xs text-red-300">
                Control-measure catalog failed to load. You can still use the
                drawing tools.
              </aside>
            }
          >
            <CatalogPanel
              standard={standard}
              identity={identity}
              status={status}
              geometry={store.tool === "cm-line" ? "line" : "point"}
              selectedEntity={
                store.tool === "cm-line" ? cmLineEntity : cmEntity
              }
              onStandard={setStandard}
              onIdentity={setIdentity}
              onStatus={setStatus}
              onSelect={(def) =>
                def.geometry === "line"
                  ? setCmLineEntity(def.entity)
                  : setCmEntity(def.entity)
              }
            />
          </ErrorBoundary>
        )}
        <main className="relative min-w-0 flex-1">
          <ClientMap
            graphics={store.graphics}
            selectedId={store.selectedId}
            selectedVertexIndex={store.selectedVertexIndex}
            tool={store.tool}
            draft={store.draft}
            hoverRef={hoverRef}
            headingDeg={headingDeg}
            linearTargetPreview={
              store.tool === "cm-line" && isLinearTarget(cmLineEntity ?? undefined)
                ? {
                    headingDeg: DEFAULT_LINEAR_TARGET_HEADING_DEG,
                    entity: cmLineEntity ?? "240701",
                    identity,
                    status,
                  }
                : null
            }
            fitRequest={fitRequest}
            onSelect={(id) => {
              if (store.tool === "erase") {
                store.removeGraphic(id);
                return;
              }
              store.selectGraphic(id);
            }}
            onEraseIds={(ids) => {
              store.removeGraphics(ids);
              const n = ids.length;
              setImportStatus(
                n === 1 ? "Deleted 1 graphic." : `Deleted ${n} graphics.`,
              );
            }}
            onDeselect={() => store.selectGraphic(null)}
            onMapClick={onMapClick}
            onFinish={finishDraft}
            onMoveVertex={store.moveVertex}
            onInsertVertex={store.insertVertex}
            onRemoveVertex={store.removeVertex}
            onSelectVertex={store.setSelectedVertexIndex}
            onTranslate={store.translateGraphic}
            onRadius={store.resizeCircle}
            onHeading={store.setRectHeading}
            onRectangleHeading={setHeadingDeg}
            onHeadingDelta={(deg) =>
              setHeadingDeg((h) => normalizeHeading(h + deg))
            }
          />
        </main>
        <SidePanel
          graphics={store.graphics}
          selected={store.selected}
          selectedVertexIndex={store.selectedVertexIndex}
          onSelect={(id) => store.selectGraphic(id)}
          onUpdate={store.updateGraphic}
          onRemove={store.removeGraphic}
          onSelectVertex={store.setSelectedVertexIndex}
          onMoveVertex={(index, ll) => {
            if (store.selected) store.moveVertex(store.selected.id, index, ll);
          }}
          onRemoveVertex={(index) => {
            if (store.selected) store.removeVertex(store.selected.id, index);
          }}
          onHeading={(deg) => {
            if (store.selected) store.setRectHeading(store.selected.id, deg);
          }}
          onRectSize={(patch) => {
            if (store.selected) store.setRectSize(store.selected.id, patch);
          }}
        />
      </div>
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-[2000] flex items-center justify-center bg-slate-950/70">
          <div className="rounded-lg border border-dashed border-sky-400 px-6 py-4 text-sm text-sky-100">
            Drop GeoJSON, KML, KMZ, or CSV
          </div>
        </div>
      )}
    </div>
  );
}
