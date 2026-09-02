import { TOOL_LABELS, type DrawTool } from "@/types/graphic";

const EDIT_TOOLS: DrawTool[] = ["select", "erase"];
const DRAW_TOOLS: DrawTool[] = [
  "point",
  "line",
  "rectangle",
  "polygon",
  "circle",
  "cm-point",
  "cm-line",
];

const HINTS: Record<DrawTool, string> = {
  select:
    "Select a graphic, then drag vertices or the shape. Hollow diamonds add vertices. Double-click a vertex to delete it.",
  erase:
    "Click a graphic to delete it. Drag a box on the map to delete everything inside.",
  point: "Click the map to drop a point",
  line: "Click vertices · Enter or double-click to finish",
  rectangle:
    "Click a corner, then the opposite corner. Move the mouse or scroll to set attitude, then click or Enter.",
  polygon: "Click vertices · Enter or double-click to close",
  circle: "Click center, then click a point on the radius",
  "cm-point":
    "Pick a control-measure point, then click the map. Stays in this tool so you can place several.",
  "cm-line":
    "Pick a 2525 line. Linear target: click the center. Other lines: click vertices, then Enter or double-click to finish.",
};

function ToolButton({
  t,
  tool,
  onTool,
}: {
  t: DrawTool;
  tool: DrawTool;
  onTool: (t: DrawTool) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTool(t)}
      className={`rounded px-3 py-2 text-left text-sm ${
        tool === t
          ? t === "erase"
            ? "bg-red-500/20 text-red-200 ring-1 ring-red-500/50"
            : "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/50"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {TOOL_LABELS[t]}
    </button>
  );
}

export function ToolRail({
  tool,
  onTool,
  onFinish,
  onCancel,
  canFinish,
  headingDeg,
}: {
  tool: DrawTool;
  onTool: (t: DrawTool) => void;
  onFinish: () => void;
  onCancel: () => void;
  canFinish: boolean;
  headingDeg: number;
}) {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Edit
      </div>
      <div className="flex flex-col gap-1 p-2">
        {EDIT_TOOLS.map((t) => (
          <ToolButton key={t} t={t} tool={tool} onTool={onTool} />
        ))}
      </div>
      <div className="border-b border-t border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Draw
      </div>
      <div className="flex flex-col gap-1 p-2">
        {DRAW_TOOLS.map((t) => (
          <ToolButton key={t} t={t} tool={tool} onTool={onTool} />
        ))}
      </div>
      {(tool === "line" ||
        tool === "cm-line" ||
        tool === "polygon" ||
        tool === "rectangle") && (
        <div className="flex gap-1 px-2">
          <button
            type="button"
            disabled={!canFinish}
            onClick={onFinish}
            className="flex-1 rounded bg-sky-600 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            Finish
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
          >
            Cancel
          </button>
        </div>
      )}
      {tool === "rectangle" && (
        <div className="mx-2 mt-1 rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-slate-300">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Attitude
          </div>
          <div className="mt-0.5 font-mono text-sky-200">
            {headingDeg.toFixed(0).padStart(3, "0")}°
          </div>
          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            Scroll or ← → to rotate while drawing
          </p>
        </div>
      )}
      <p className="mt-auto px-3 py-3 text-[11px] leading-relaxed text-slate-500">
        {HINTS[tool]}
      </p>
    </aside>
  );
}
