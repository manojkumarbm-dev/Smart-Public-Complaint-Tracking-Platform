import React, { useEffect, useRef, useState } from "react";
import {
  Camera, RefreshCw, X, Loader2, AlertCircle, CheckCircle2, SwitchCamera, ImagePlus, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// In-app camera capture that burns GPS coordinates + timestamp onto the photo,
// producing a genuinely geo-tagged image. Falls back to file upload when no
// camera is available or permission is denied.
export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [facing, setFacing] = useState("environment");
  const [geo, setGeo] = useState(null);
  const [gettingGeo, setGettingGeo] = useState(false);
  const [shot, setShot] = useState(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  };

  const getGeo = () => {
    if (!navigator.geolocation) return;
    setGettingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        });
        setGettingGeo(false);
      },
      () => setGettingGeo(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const startCamera = async (facingMode = facing) => {
    stopStream();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported on this device. Upload a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setStreaming(true);
      }
    } catch (err) {
      setError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access or upload a photo instead."
          : "Camera unavailable. You can upload a photo instead."
      );
    }
  };

  useEffect(() => {
    startCamera(facing);
    getGeo();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    startCamera(next);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !streaming) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    // mirror front camera for a natural preview match
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Burn the geo-tag watermark onto the image
    const stamp = geo
      ? `${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}  •  ${new Date(geo.timestamp).toLocaleString()}`
      : `SmartCity Report  •  ${new Date().toLocaleString()}`;
    const barH = Math.max(28, Math.round(canvas.height * 0.08));
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(barH * 0.42)}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(stamp.slice(0, 80), 12, canvas.height - barH / 2);

    setShot(canvas.toDataURL("image/jpeg", 0.85));
    stopStream();
  };

  const retake = () => {
    setShot(null);
    startCamera(facing);
    getGeo();
  };

  const confirm = async () => {
    const res = await fetch(shot);
    const blob = await res.blob();
    const file = new File([blob], `report-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture({
      file,
      preview: shot,
      geo: geo || { latitude: null, longitude: null, timestamp: new Date().toISOString() },
    });
  };

  const useFallback = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onCapture({
      file,
      preview,
      geo: geo || { latitude: null, longitude: null, timestamp: new Date().toISOString() },
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded-xl overflow-hidden bg-slate-900 aspect-video">
        {/* Live camera feed */}
        {!shot && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}
        {/* Captured frame */}
        {shot && <img src={shot} alt="captured" className="w-full h-full object-cover" />}

        {/* Top status bar */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            <MapPin size={12} className={geo ? "text-green-400" : "text-amber-400"} />
            {gettingGeo ? "Locating…" : geo ? "GPS locked" : "GPS waiting"}
          </span>
          {!shot && (
            <button
              type="button"
              onClick={switchCamera}
              className="inline-flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full hover:bg-black/70"
            >
              <SwitchCamera size={12} /> Flip
            </button>
          )}
        </div>

        {/* No-stream placeholder */}
        {!streaming && !shot && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Starting camera…
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2.5">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Controls */}
      {!shot && !error && (
        <div className="flex items-center justify-center gap-3">
          <Button type="button" onClick={capture} disabled={!streaming} className="bg-blue-700 hover:bg-blue-800 px-6">
            <Camera size={18} /> Capture Photo
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X size={16} /> Cancel
            </Button>
          )}
        </div>
      )}

      {shot && (
        <div className="flex items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={retake}>
            <RefreshCw size={16} /> Retake
          </Button>
          <Button type="button" onClick={confirm} className="bg-green-600 hover:bg-green-700 px-6">
            <CheckCircle2 size={18} /> Use Photo
          </Button>
        </div>
      )}

      {/* Fallback upload */}
      {error && (
        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
          <ImagePlus className="text-slate-400 mb-2" />
          <span className="text-sm text-slate-500">Upload a photo instead</span>
          <input type="file" accept="image/*" className="hidden" onChange={useFallback} />
        </label>
      )}
    </div>
  );
}