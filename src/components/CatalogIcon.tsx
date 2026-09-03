import { useEffect, useState } from "react";
import { renderMilSymbolDataUrl } from "@/lib/milSymbol";
import { CM_HALO } from "@/lib/cmLine";
import type { GraphicSymbol } from "@/domain/sidc";

function symbolFromSidc(sidc: string): GraphicSymbol {
  return {
    standard: sidc.startsWith("11") ? "2525E" : "2525D",
    symbolSet: sidc.slice(4, 6) || "25",
    entity: sidc.slice(10, 16),
    identity: sidc.slice(2, 4),
    status: sidc.slice(6, 7),
    sidc,
  };
}

export function LineCatalogIcon({
  abbrev,
  color,
  draw,
}: {
  abbrev: string;
  color: string;
  draw?: string;
}) {
  const arrow =
    draw === "arrow" || draw === "arrow-double" || draw === "arrow-dashed";
  const dash =
    draw === "light" || draw === "arrow-dashed" ? "4 3" : undefined;
  const label = draw === "boundary" ? "BNDRY" : abbrev || (draw === "ibeam" ? "AP" : "");
  const glyph = () => (
    <>
      {draw === "flot" ? (
        [8, 20, 32].map((x) => (
          <path key={x} d={`M ${x} 18 A 6 6 0 0 0 ${x + 12} 18`} />
        ))
      ) : (
        <line
          x1={draw === "phase" || draw === "ends" ? "12" : "2"}
          y1="18"
          x2={arrow ? "36" : draw === "phase" || draw === "ends" ? "36" : "46"}
          y2="18"
          strokeDasharray={dash}
        />
      )}
      {(draw === "light" ||
        draw === "ibeam" ||
        draw === "phase" ||
        draw === "ends") && (
        <>
          <line x1="2" y1="13" x2="2" y2="23" />
          <line x1="46" y1="13" x2="46" y2="23" />
        </>
      )}
      {draw === "feba" &&
        [10, 22, 34].map((x) => (
          <path
            key={x}
            d={`M ${x - 4} 18 L ${x - 4} 12 L ${x + 4} 12 L ${x + 4} 18`}
          />
        ))}
      {arrow && <path d="M34 13 L46 18 L34 23 Z" />}
    </>
  );
  return (
    <span className="inline-flex h-8 w-12 shrink-0 items-center justify-center">
      <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden>
        <g
          fill="none"
          stroke={CM_HALO}
          strokeWidth={3.5}
          strokeLinecap="square"
          strokeLinejoin="round"
        >
          {glyph()}
        </g>
        <g
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="square"
          strokeLinejoin="round"
        >
          {glyph()}
        </g>
        {arrow ? (
          <path d="M34 13 L46 18 L34 23 Z" fill={color} stroke="none" />
        ) : null}
        {label ? (
          <text
            x="24"
            y="9"
            textAnchor="middle"
            fill={color}
            stroke={CM_HALO}
            strokeWidth={3}
            paintOrder="stroke fill"
            fontSize="8"
            fontFamily="Segoe UI, sans-serif"
          >
            {label}
          </text>
        ) : null}
      </svg>
    </span>
  );
}

export function AreaCatalogIcon({
  abbrev,
  color,
  draw,
}: {
  abbrev: string;
  color: string;
  draw?: string;
}) {
  const circle = draw === "circle";
  const label = abbrev.slice(0, 6);
  const shape = () =>
    circle ? (
      <circle cx="24" cy="14" r="8" />
    ) : (
      <polygon points="8,20 16,6 32,6 40,20 24,22" />
    );
  return (
    <span className="inline-flex h-8 w-12 shrink-0 items-center justify-center">
      <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden>
        <g
          fill="none"
          stroke={CM_HALO}
          strokeWidth={3.5}
          strokeLinejoin="round"
        >
          {shape()}
        </g>
        <g
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        >
          {shape()}
        </g>
        {label ? (
          <text
            x="24"
            y="11"
            textAnchor="middle"
            fill={color}
            stroke={CM_HALO}
            strokeWidth={3}
            paintOrder="stroke fill"
            fontSize="7"
            fontFamily="Segoe UI, sans-serif"
          >
            {label}
          </text>
        ) : null}
      </svg>
    </span>
  );
}

/** Thumbnail after mount so milsymbol cannot blank the catalog. */
export function CatalogIcon({ sidc }: { sidc: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    setSrc(renderMilSymbolDataUrl(symbolFromSidc(sidc), 48));
  }, [sidc]);

  if (!src) {
    return (
      <span className="inline-flex h-16 w-10 shrink-0 items-end justify-center rounded border border-slate-700 bg-slate-900 font-mono text-[8px] text-slate-500">
        …
      </span>
    );
  }
  return (
    <span className="catalog-icon mil-symbol inline-flex h-16 w-10 shrink-0 items-end justify-center overflow-visible">
      <img src={src} alt="" draggable={false} />
    </span>
  );
}
