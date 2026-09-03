import { useRef } from "react";
import { Circle, Polygon, Polyline } from "react-leaflet";
import type { CircleProps, PolygonProps, PolylineProps } from "react-leaflet";
import { isFiniteLatLng, polygonPath, polylinePath, samePath } from "@/lib/latlng";
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

export function SafeCircle({
  center,
  radius,
  ...props
}: CircleProps) {
  const c = Array.isArray(center) ? (center as LatLng) : null;
  if (!c || !isFiniteLatLng(c)) return null;
  if (typeof radius !== "number" || !Number.isFinite(radius) || radius <= 0) {
    return null;
  }
  return <Circle center={c} radius={radius} {...props} />;
}
