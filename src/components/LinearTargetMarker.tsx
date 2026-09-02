import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { cmStrokeColor } from "@/lib/cmLine";
import { linearTargetCenter } from "@/lib/linearTarget";
import { makeLinearTargetIcon } from "@/lib/linearTargetIcon";
import type { Graphic, LatLng } from "@/types/graphic";

export function LinearTargetMarker({
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
  const center = linearTargetCenter(graphic);
  const color = cmStrokeColor(graphic.symbol?.identity ?? "03", selected);
  const icon = useMemo(
    () => makeLinearTargetIcon(graphic, color, selected),
    [graphic, color, selected],
  );

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
