import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

// Small helper component to handle clicks
function LocationSelector({ position, onChange }: { position: [number, number] | null; onChange: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  initialLat?: number | null;
  initialLon?: number | null;
  onSelect: (lat: number, lon: number, address?: string | null) => void;
}

export default function MapPicker({ initialLat, initialLon, onSelect }: Props) {
  useEffect(() => {
    // @ts-ignore
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  const SURCO_CENTER: [number, number] = [-12.1101, -76.9955];
  const center: [number, number] = initialLat && initialLon ? [initialLat, initialLon] : SURCO_CENTER;
  const [pos, setPos] = useState<[number, number] | null>(initialLat && initialLon ? [initialLat, initialLon] : null);
  const [address, setAddress] = useState<string | null>(null);
  const [geojson, setGeojson] = useState<any | null>(null);

  // Red marker icon for selection
  const redDotIcon = L.divIcon({
    className: 'case-red-marker',
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#e11d48;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeTimeout = useRef<number | null>(null);

  const scheduleInvalidate = () => {
    if (resizeTimeout.current) window.clearTimeout(resizeTimeout.current);
    resizeTimeout.current = window.setTimeout(() => {
      try {
        mapRef.current?.invalidateSize();
      } catch (e) {}
    }, 120) as unknown as number;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => scheduleInvalidate());
      ro.observe(el);
    } catch (e) {
      // ResizeObserver may not be available in all envs
    }
    const onWin = () => scheduleInvalidate();
    window.addEventListener("resize", onWin);
    // ensure initial invalidate
    scheduleInvalidate();
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", onWin);
      if (resizeTimeout.current) window.clearTimeout(resizeTimeout.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/sectores_cuadrantes.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setGeojson(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleChange = async (lat: number, lon: number) => {
    setPos([lat, lon]);
    // Reverse geocode using Nominatim
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        const display = data?.display_name ?? null;
        setAddress(display);
        onSelect(lat, lon, display);
      } else {
        setAddress(null);
        onSelect(lat, lon, null);
      }
    } catch (e) {
      setAddress(null);
      onSelect(lat, lon, null);
    }
  };

  return (
    <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-lg border">
      <MapContainer
        center={center}
        zoom={initialLat && initialLon ? 14 : 13}
        className="h-full w-full"
        whenCreated={(m) => {
          mapRef.current = m;
          // Invalidate size after mount
          window.setTimeout(() => {
            try {
              m.invalidateSize();
            } catch (e) {}
          }, 120);
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {geojson && (
          <GeoJSON data={geojson as any} style={() => ({ color: '#0ea5e9', weight: 1, fillColor: '#38bdf8', fillOpacity: 0.08 })} />
        )}
        <LocationSelector position={pos} onChange={handleChange} />
        {pos && (
          <Marker position={pos} icon={redDotIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Ubicación seleccionada</div>
                <div className="text-xs text-muted-foreground">{address ?? "Sin dirección"}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
