import { useRef } from "react";
import { Polygon, Polyline } from "react-leaflet";
import type { PolygonProps, PolylineProps } from "react-leaflet";
import { polygonPath, polylinePath, samePath } from "@/lib/latlng";
import type { LatLng } from "@/types/graphic";

function useStablePath(next: LatLng[] | null): LatLng[] | null {
  const ref = useRef<LatLng[] | null>(null);
  if (samePath(next, ref.current)) return ref.current;
  ref.current = next;
  return next;
}

/** Skip layers whose positions would crash Leaflet `_projectLatlngs`. */
export function SafePolyline({ positions, ...props }: PolylineProps) {
  const pts = useStablePath(polylinePath(positions));
  if (!pts) return null;
  return <Polyline positions={pts} {...props} />;
}

export function SafePolygon({ positions, ...props }: PolygonProps) {
  const pts = useStablePath(polygonPath(positions));
  if (!pts) return null;
  return <Polygon positions={pts} {...props} />;
}
