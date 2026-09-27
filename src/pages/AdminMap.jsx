import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AdminLayout from "@/components/AdminLayout";
import MapView from "@/components/MapView";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Loader2, Crosshair, MapPin, AlertCircle } from "lucide-react";

const STATUSES = ["Submitted", "Verified", "Assigned", "In Progress", "Resolved", "Closed"];

export default function AdminMap() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    base44.entities.Problem.list("-created_date", 500)
      .then(setProblems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location services.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(c);
        setCenter(c);
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location — please allow location access in your browser and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const filtered = problems.filter((p) =>
    p.latitude && p.longitude &&
    (statusFilter === "All" || p.status === statusFilter) &&
    (categoryFilter === "All" || p.category === categoryFilter)
  );

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Map View</h1>
      <p className="text-slate-500 mb-6">All reported problems on an interactive map.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={locate} disabled={locating} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 px-3 disabled:opacity-60">
          {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          {locating ? "Locating..." : "Center on me"}
        </button>
        <div className="text-sm text-slate-500 self-center ml-auto flex items-center gap-1"><MapPin size={14} /> {filtered.length} mapped</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <MapView problems={filtered} center={center} height="650px" userLocation={userLocation} />
      )}
    </AdminLayout>
  );
}