import React from "react";
import {
  MapPin, Clock, RefreshCw, ArrowLeft, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import MapView from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function LocationVerify({
  latitude, longitude, geoTimestamp, address, addressDetecting, locating, error,
  onRecapture, onBack, onConfirm, submitting,
}) {
  const hasLocation = latitude != null && longitude != null;
  const pin = hasLocation
    ? [{ id: "verify", latitude, longitude, status: "Submitted", title: "Report location", problem_id: "", category: "Other", address }]
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Verify Location</h2>
        <p className="text-slate-500 text-sm mt-1">
          Confirm the GPS location captured with your report is correct before submitting.
        </p>
      </div>

      {!hasLocation && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Location permission required</p>
            <p className="text-amber-700">
              We need your GPS location to geo-tag this report. Tap “Recapture GPS” and allow location access.
            </p>
          </div>
        </div>
      )}

      {hasLocation && (
        <MapView problems={pin} center={[latitude, longitude]} height="320px" />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <MapPin size={16} className="text-blue-600" />
          <span className="font-medium">Coordinates</span>
          <span className="ml-auto font-mono text-slate-600">
            {hasLocation ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Clock size={16} className="text-green-600" />
          <span className="font-medium">Captured at</span>
          <span className="ml-auto text-slate-600 text-right">
            {geoTimestamp ? format(new Date(geoTimestamp), "MMM d, yyyy 'at' h:mm:ss a") : "—"}
          </span>
        </div>
        {(address || addressDetecting) && (
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin size={16} className="text-slate-400" />
            <span className="font-medium">Address</span>
            <span className="ml-auto text-slate-600 text-right max-w-[60%]">
              {address || (addressDetecting ? "Detecting address…" : "")}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="sm:flex-1">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button type="button" variant="secondary" onClick={onRecapture} disabled={locating} className="sm:flex-1">
          {locating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Recapture GPS
        </Button>
        <Button type="button" onClick={onConfirm} disabled={!hasLocation || submitting} className="sm:flex-1 bg-blue-700 hover:bg-blue-800">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Confirm &amp; Submit
        </Button>
      </div>
    </div>
  );
}