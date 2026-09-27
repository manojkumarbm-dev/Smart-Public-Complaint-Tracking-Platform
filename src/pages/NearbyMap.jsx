import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CitizenLayout from "@/components/CitizenLayout";
import MapView from "@/components/MapView";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Loader2, MapPin, Crosshair, AlertCircle } from "lucide-react";

export default function NearbyMap() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
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

  useEffect(() => { locate(); }, []);

  const filtered = problems.filter((p) =>
    p.latitude && p.longitude && (categoryFilter === "All" || p.category === categoryFilter)
  );

  return (
    <CitizenLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Nearby Problems Map</h1>
      <p className="text-slate-500 mb-6">Explore reported problems around your area.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={locate} disabled={locating} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 px-3 disabled:opacity-60">
          {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          {locating ? "Locating..." : "Center on my location"}
        </button>
      </div>

      {locationError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2 mb-4">
          <AlertCircle size={14} /> {locationError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MapView problems={filtered} center={center} height="600px" userLocation={userLocation} />
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            <p className="text-sm font-medium text-slate-700">{filtered.length} problems on map</p>
            {filtered.map((p) => (
              <Link key={p.id} to={`/problems/${p.id}`} className="block bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={p.category} size={16} />
                  <span className="font-medium text-sm text-slate-900 truncate flex-1">{p.title}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <StatusBadge status={p.status} />
                  {p.address && <span className="text-xs text-slate-400 flex items-center gap-1 truncate ml-2"><MapPin size={10} />{p.address}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </CitizenLayout>
  );
}