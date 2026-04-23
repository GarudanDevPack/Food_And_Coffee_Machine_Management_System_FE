"use client";
/**
 * LocationPickerMap — interactive Leaflet map for picking lat/lng.
 * Rendered client-side only (imported via dynamic() with ssr:false).
 *
 * Props:
 *   value   – current { lat, lng } or null
 *   onChange – called with { lat, lng } when user clicks the map
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

// Fix Leaflet's broken default marker icon in webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LatLng {
  lat: number;
  lng: number;
}

function ClickHandler({ onChange }: { onChange: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface Props {
  value: LatLng | null;
  onChange: (ll: LatLng) => void;
  height?: number;
}

export default function LocationPickerMap({
  value,
  onChange,
  height = 380,
}: Props) {
  const [ready, setReady] = useState(false);

  // Avoid SSR hydration mismatch — render map only after mount
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready)
    return (
      <div
        style={{ height }}
        className="bg-light rounded d-flex align-items-center justify-content-center text-muted fs-13"
      >
        Loading map…
      </div>
    );

  // Default center: Colombo, Sri Lanka
  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [6.9271, 79.8612];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height, width: "100%", borderRadius: 6 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onChange={onChange} />
      {value && <Marker position={[value.lat, value.lng]} />}
    </MapContainer>
  );
}
