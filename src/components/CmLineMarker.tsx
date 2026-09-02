import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { cmLineAnchor, cmStrokeColor } from "@/lib/cmLine";
import { cmLineSvg } from "@/lib/cmLineSvg";
import type { Graphic, LatLng } from "@/types/graphic";

export function CmLineMarker({
  graphic,
  selected,
  editing,
  onSelect,
  onMove,
}: {
  graphic: Graphic;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onMove: (ll: LatLng) => void;
}) {
  const center = cmLineAnchor(graphic);
  const color = cmStrokeColor(graphic.symbol?.identity ?? "03", selected);
  const icon = useMemo(() => {
    const drawn = cmLineSvg(graphic, color, selected);
    return L.divIcon({
      className: "cm-line-label",
      html: drawn.html,
      iconSize: [drawn.width, drawn.height],
      iconAnchor: [drawn.anchorX, drawn.anchorY],
    });
  }, [graphic, color, selected]);

  if (!center) return null;

  return (
    <Marker
      position={center}
      icon={icon}
      draggable={editing}
      autoPan={false}
      zIndexOffset={selected ? 800 : 400}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stop(e.originalEvent);
          onSelect();
        },
        dragend: (e) => {
          const ll = e.target.getLatLng();
          onMove([ll.lat, ll.lng]);
        },
      }}
    />
  );
}
