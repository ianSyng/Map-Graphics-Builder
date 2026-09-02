import { useEffect, useRef, useState } from "react";
import { downloadBlob, exportGraphics, type ExportFormat } from "@/lib/io";
import type { Graphic } from "@/types/graphic";

const EXPORTS: { id: ExportFormat; label: string }[] = [
  { id: "geojson", label: "GeoJSON" },
  { id: "kml", label: "KML" },
  { id: "kmz", label: "KMZ" },
  { id: "csv", label: "CSV" },
];

export function AppHeader({
  graphics,
  status,
  onImportFile,
  onClear,
}: {
  graphics: Graphic[];
  status: string | null;
  onImportFile: (file: File) => void;
  onClear: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".geojson,.json,.kml,.kmz,.csv,.tsv,application/geo+json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,text/csv";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) onImportFile(file);
    };
    input.click();
  }

  async function onExport(format: ExportFormat) {
    setMenuOpen(false);
    const { blob, filename } = await exportGraphics(graphics, format);
    downloadBlob(blob, filename);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400" />
        <h1 className="text-sm font-semibold tracking-wide text-slate-100">
          Map Graphics Builder
        </h1>
      </div>
      <span className="hidden text-[11px] text-slate-500 sm:inline">
        Draw · GeoJSON · KML · KMZ · CSV
      </span>
      {status && (
        <span className="truncate text-[11px] text-sky-300" title={status}>
          {status}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={pickFile}
          className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
        >
          Import
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            Export
          </button>
          {menuOpen && (
            <ul
              role="menu"
              className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded border border-slate-700 bg-slate-900 py-1 shadow-lg"
            >
              {EXPORTS.map((item) => (
                <li key={item.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void onExport(item.id)}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          Clear
        </button>
      </div>
    </header>
  );
}
