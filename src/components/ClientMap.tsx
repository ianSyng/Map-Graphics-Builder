import { useEffect, useState } from "react";
import { MapView, type MapViewProps } from "@/components/MapView";

/** Leaflet touches `window`; mount only after the client is ready. */
export function ClientMap(props: MapViewProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading map…
      </div>
    );
  }
  return <MapView {...props} />;
}
