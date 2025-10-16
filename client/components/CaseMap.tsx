import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { CrimeCase } from "@shared/api";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon path for Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function CaseMap({ items }: { items: CrimeCase[] }) {
  useEffect(() => {
    // @ts-ignore
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  const SURCO_CENTER: [number, number] = [-12.1101, -76.9955];
  const center = items.length
    ? ([items[0].latitude, items[0].longitude] as [number, number])
    : SURCO_CENTER;

  // Delay rendering the map container slightly to avoid ResizeObserver race conditions
  const [ready, setReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const invalidateTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeTimeout = useRef<number | null>(null);

  useEffect(() => {
    // Render on next tick + small delay
    const id = window.setTimeout(() => setReady(true), 50);
    return () => window.clearTimeout(id);
  }, []);

  const scheduleInvalidate = () => {
    if (resizeTimeout.current) window.clearTimeout(resizeTimeout.current);
    resizeTimeout.current = window.setTimeout(() => {
      try {
        mapRef.current?.invalidateSize();
      } catch (e) {}
    }, 120) as unknown as number;
  };

  // Invalidate size when items change (debounced)
  useEffect(() => {
    if (!mapRef.current) return;
    scheduleInvalidate();
  }, [items]);

  // Observe container size and window resize to invalidate map (debounced)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => scheduleInvalidate());
      ro.observe(el);
    } catch (e) {}
    const onWin = () => scheduleInvalidate();
    window.addEventListener('resize', onWin);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onWin);
      if (resizeTimeout.current) window.clearTimeout(resizeTimeout.current);
    };
  }, [items]);

  const statusLabel = (s: string) => {
    if (!s) return s;
    if (s === "Open") return "Abierto";
    if (s === "Investigating") return "Investigando";
    if (s === "Closed") return "Cerrado";
    return s;
  };

  return (
    <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-lg border">
      {ready ? (
        <MapContainer
          center={center}
          zoom={13}
          className="h-full w-full"
          whenCreated={(map) => {
            mapRef.current = map;
            // Invalidate after mount
            window.setTimeout(() => scheduleInvalidate(), 120);
            // Also try invalidate on next frame
            window.requestAnimationFrame(() => scheduleInvalidate());
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          {items.map((c) => (
            <Marker key={c.id} position={[c.latitude, c.longitude]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{c.title} <span className="text-xs text-muted-foreground">#{c.code}</span></div>
                  <div className="text-muted-foreground">{c.crimeType} — {statusLabel(c.status)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.place}</div>
                  <div className="mt-1">{c.description}</div>
                  <div className="mt-2 text-xs">
                    <div>Fecha: {c.date} {c.hour}</div>
                    <div>Cuad: {c.cuadrante ?? "—"} • Sec: {c.sector ?? "—"}</div>
                    {c.suspect && <div>Sospechoso: {c.suspect}</div>}
                    {c.victim && <div>Víctima: {c.victim}</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>
      )}
    </div>
  );
}
