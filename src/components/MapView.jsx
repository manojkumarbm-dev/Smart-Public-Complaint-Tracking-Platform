import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/CategoryIcon";

// Fix default marker icons for leaflet in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_PIN_COLORS = {
  "Submitted": "#2563eb",
  "Verified": "#4f46e5",
  "Assigned": "#d97706",
  "In Progress": "#ea580c",
  "Resolved": "#16a34a",
  "Closed": "#64748b",
};

function makePinIcon(color) {
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 18],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: "user-pin",
    html: `<div style="width:18px;height:18px;position:relative;"><div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,.3),0 1px 4px rgba(0,0,0,.4);"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom() || 13);
  }, [center, map]);
  return null;
}

export default function MapView({ problems = [], center, height = "400px", onMapClick, selectedId, userLocation }) {
  const defaultCenter = center || (problems[0] ? [problems[0].latitude, problems[0].longitude] : [40.7128, -74.006]);

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-200">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Recenter center={center} />
        {userLocation && (
          <Marker position={userLocation} icon={makeUserIcon()} zIndexOffset={1000}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {problems.map((p) =>
          p.latitude && p.longitude ? (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={makePinIcon(STATUS_PIN_COLORS[p.status] || "#2563eb")}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryIcon category={p.category} size={16} />
                    <span className="font-semibold text-sm">{p.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">{p.problem_id} · {p.category}</div>
                  {p.address && <div className="text-xs text-slate-500 mb-2">{p.address}</div>}
                  <StatusBadge status={p.status} />
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}