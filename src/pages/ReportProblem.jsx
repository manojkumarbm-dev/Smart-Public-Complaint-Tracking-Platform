import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { reverseGeocode } from "@/lib/geocode";
import CitizenLayout from "@/components/CitizenLayout";
import LocationVerify from "@/components/LocationVerify";
import CameraCapture from "@/components/CameraCapture";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Camera, MapPin, Loader2, AlertCircle, ArrowLeft, Crosshair, ArrowRight, CheckCircle2, ImagePlus,
} from "lucide-react";

function generateProblemId() {
  return "PRB-" + Math.random().toString(36).toUpperCase().slice(2, 8);
}

export default function ReportProblem() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "", category: "Pothole", description: "", address: "",
    priority: "Medium", latitude: null, longitude: null, geo_timestamp: null,
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [hasGeo, setHasGeo] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const resolveAddress = async (lat, lng) => {
    setResolvingAddress(true);
    const addr = await reverseGeocode(lat, lng);
    if (addr) setForm((f) => (f.address ? f : { ...f, address: addr }));
    setResolvingAddress(false);
  };

  const handleCameraCapture = ({ file, preview, geo }) => {
    setImage(file);
    setImagePreview(preview);
    setCameraOpen(false);
    if (geo?.latitude != null && geo?.longitude != null) {
      update("latitude", geo.latitude);
      update("longitude", geo.longitude);
      update("geo_timestamp", geo.timestamp);
      setHasGeo(true);
      resolveAddress(geo.latitude, geo.longitude);
    }
  };

  const handleGalleryImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const getLocation = () => {
    setLocating(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("latitude", pos.coords.latitude);
        update("longitude", pos.coords.longitude);
        update("geo_timestamp", new Date().toISOString());
        setHasGeo(true);
        resolveAddress(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError("Could not get your location. Please allow location access in your browser settings.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const goToVerify = (e) => {
    e?.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("Please provide a title and description.");
      return;
    }
    if (!form.latitude || !form.longitude) {
      getLocation();
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.latitude || !form.longitude) {
      setError("Location is required. Please allow GPS access to geo-tag your report.");
      return;
    }
    setSubmitting(true);
    try {
      let image_url = "";
      if (image) {
        const res = await base44.integrations.Core.UploadFile({ file: image });
        image_url = res.file_url;
      }
      const problem_id = generateProblemId();
      const problem = await base44.entities.Problem.create({
        ...form,
        problem_id,
        image_url,
        status: "Submitted",
      });
      try {
        const admins = await base44.entities.User.list();
        const adminIds = admins.filter((u) => u.role === "admin").map((u) => u.id);
        if (adminIds.length) {
          await base44.entities.Notification.bulkCreate(
            adminIds.map((uid) => ({
              user_id: uid,
              problem_id: problem.id,
              message: `New problem reported: ${form.title} (${problem_id})`,
              type: "new_report",
              read: false,
            }))
          );
        }
      } catch {}
      navigate(`/problems/${problem.id}?submitted=1`);
    } catch (err) {
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CitizenLayout>
      <button
        onClick={() => (step === 2 ? setStep(1) : navigate(-1))}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>
      <div className="max-w-2xl">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-blue-700 font-medium" : "text-slate-400"}`}>
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
            Details & Photo
          </div>
          <div className="flex-1 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-blue-700 font-medium" : "text-slate-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}>2</span>
            Verify Location
          </div>
        </div>

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Report a Problem</h1>
            <p className="text-slate-500 mt-1 mb-6">
              Start by capturing a geo-tagged photo of the issue. Your GPS location is attached to the photo automatically.
            </p>

            <form onSubmit={goToVerify} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Geo-tagged photo — primary action, first */}
              <div>
                <Label>Geo-tagged Photo</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  The photo is stamped with your GPS coordinates and the exact capture time.
                </p>
                <div className="mt-2">
                  {cameraOpen ? (
                    <CameraCapture
                      onCapture={handleCameraCapture}
                      onCancel={() => setCameraOpen(false)}
                    />
                  ) : imagePreview ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200">
                      <img src={imagePreview} alt="preview" className="w-full h-48 object-cover" />
                      {hasGeo && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                          <MapPin size={12} /> Geo-tagged
                        </span>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCameraOpen(true)}
                          className="bg-black/60 text-white rounded-lg px-2 py-1 text-xs hover:bg-black/70"
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={() => { setImage(null); setImagePreview(null); setHasGeo(false); }}
                          className="bg-black/60 text-white rounded-lg px-2 py-1 text-xs hover:bg-black/70"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="flex flex-col items-center justify-center h-40 border-2 border-blue-300 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <Camera className="text-blue-600 mb-2" size={28} />
                        <span className="text-sm font-medium text-blue-700">Capture Geo-tagged Photo</span>
                        <span className="text-xs text-blue-500 mt-0.5">Opens your camera</span>
                      </button>
                      <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                        <ImagePlus className="text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Choose from Gallery</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleGalleryImage} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Problem Title *</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Large pothole on Main Street" className="mt-1.5" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select
                    value={form.priority}
                    onChange={(e) => update("priority", e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe the problem in detail..."
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Location</Label>
                <div className="mt-1.5 space-y-2">
                  <Input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Street address or landmark (optional)"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={getLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                      {form.latitude
                        ? "Re-capture GPS"
                        : "Capture my GPS location"}
                    </button>
                    {hasGeo && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> GPS locked: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                      </span>
                    )}
                    {resolvingAddress && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Detecting address…
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800">
                Continue to Verify Location <ArrowRight size={16} />
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <LocationVerify
              latitude={form.latitude}
              longitude={form.longitude}
              geoTimestamp={form.geo_timestamp}
              address={form.address}
              addressDetecting={resolvingAddress}
              locating={locating}
              error={error}
              onRecapture={getLocation}
              onBack={() => setStep(1)}
              onConfirm={handleSubmit}
              submitting={submitting}
            />
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}