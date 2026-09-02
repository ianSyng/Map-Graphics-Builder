import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { milSymbolIcon } from "@/lib/milSymbolIcon";
import type { GraphicSymbol } from "@/domain/sidc";
import type { LatLng } from "@/types/graphic";

export function SymbolMarker({
  position,
  symbol,
  selected,
  draggable,
  onSelect,
  onMove,
}: {
  position: LatLng;
  symbol: GraphicSymbol;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onMove: (ll: LatLng) => void;
}) {
  const icon = useMemo(
    () => milSymbolIcon(symbol, selected ? 48 : 40),
    [symbol, selected],
  );

  return (
    <Marker
      position={position}
      icon={icon}
      draggable={draggable}
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
