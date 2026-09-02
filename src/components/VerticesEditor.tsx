import { minVertices } from "@/lib/geometryEdit";
import { isCmLinePointGraphic } from "@/lib/cmLine";
import { rectFromGraphic } from "@/lib/rectangle";
import type { Graphic, LatLng } from "@/types/graphic";

function CoordField({
  label,
  value,
  onChange,
  step = 0.000001,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-[10px] uppercase tracking-wide text-slate-500">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
      />
    </label>
  );
}

export function VerticesEditor({
  graphic,
  selectedVertexIndex,
  onSelectVertex,
  onMoveVertex,
  onRemoveVertex,
  onHeading,
  onRectSize,
}: {
  graphic: Graphic;
  selectedVertexIndex: number | null;
  onSelectVertex: (index: number) => void;
  onMoveVertex: (index: number, ll: LatLng) => void;
  onRemoveVertex: (index: number) => void;
  onHeading: (headingDeg: number) => void;
  onRectSize: (patch: { lengthM?: number; widthM?: number }) => void;
}) {
  const canDelete = graphic.positions.length > minVertices(graphic.kind);
  const linear = isCmLinePointGraphic(graphic);
  const showList =
    (graphic.kind === "line" || graphic.kind === "polygon") && !linear;
  const center = graphic.positions[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Geometry
      </div>
      {(graphic.kind === "point" || linear) && center && (
        <div className="flex gap-2">
          <CoordField
            label="Lat"
            value={center[0]}
            onChange={(lat) => onMoveVertex(0, [lat, center[1]])}
          />
          <CoordField
            label="Lng"
            value={center[1]}
            onChange={(lng) => onMoveVertex(0, [center[0], lng])}
          />
        </div>
      )}
      {graphic.kind === "circle" && center && (
        <div className="flex gap-2">
          <CoordField
            label="Lat"
            value={center[0]}
            onChange={(lat) => onMoveVertex(0, [lat, center[1]])}
          />
          <CoordField
            label="Lng"
            value={center[1]}
            onChange={(lng) => onMoveVertex(0, [center[0], lng])}
          />
        </div>
      )}
      {graphic.kind === "rectangle" && (() => {
        const rect = rectFromGraphic(graphic);
        if (!rect) return null;
        return (
          <div className="flex flex-col gap-2">
            <CoordField
              label="Attitude °"
              value={Math.round(rect.headingDeg * 10) / 10}
              onChange={onHeading}
              step={0.1}
            />
            <div className="flex gap-2">
              <CoordField
                label="Length m"
                value={Math.round(rect.lengthM)}
                onChange={(n) => onRectSize({ lengthM: n })}
                step={1}
              />
              <CoordField
                label="Width m"
                value={Math.round(rect.widthM)}
                onChange={(n) => onRectSize({ widthM: n })}
                step={1}
              />
            </div>
          </div>
        );
      })()}
      {showList && (
        <ul className="flex max-h-40 flex-col gap-1 overflow-auto">
          {graphic.positions.map((pt, i) => (
            <li
              key={`${graphic.id}-row-${i}`}
              className={`rounded border p-1.5 ${
                selectedVertexIndex === i
                  ? "border-amber-500/60 bg-slate-800"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectVertex(i)}
                className="mb-1 text-[10px] uppercase tracking-wide text-slate-500"
              >
                Vertex {i + 1}
              </button>
              <div className="flex items-end gap-1">
                <CoordField
                  label="Lat"
                  value={pt[0]}
                  onChange={(lat) => onMoveVertex(i, [lat, pt[1]])}
                />
                <CoordField
                  label="Lng"
                  value={pt[1]}
                  onChange={(lng) => onMoveVertex(i, [pt[0], lng])}
                />
                {canDelete && (
                  <button
                    type="button"
                    title="Remove vertex"
                    onClick={() => onRemoveVertex(i)}
                    className="mb-0.5 rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-red-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
