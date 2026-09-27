import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { reverseGeocode } from "@/lib/geocode";
import { useAuth } from "@/lib/AuthContext";
import CitizenLayout from "@/components/CitizenLayout";
import AdminLayout from "@/components/AdminLayout";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Image } from "@/components/ui/image";
import MapView from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, MapPin, Clock, User, Building2, Loader2, CheckCircle2, MessageSquare, Camera, AlertCircle, ThumbsUp, Share2
} from "lucide-react";
import { format } from "date-fns";

const STATUS_FLOW = ["Submitted", "Verified", "Assigned", "In Progress", "Resolved", "Closed"];

export default function ProblemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [problem, setProblem] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(searchParams.get("submitted") === "1");
  const [adminAction, setAdminAction] = useState({ status: "", comment: "", department: "", assigned_to: "", priority: "" });
  const [resolutionImage, setResolutionImage] = useState(null);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");

  const load = async () => {
    try {
      const p = await base44.entities.Problem.get(id);
      setProblem(p);
      if (p.latitude && p.longitude && !p.address) {
        reverseGeocode(p.latitude, p.longitude).then((a) => setResolvedAddress(a || ""));
      }
      setAdminAction({
        status: p.status, comment: "", department: p.department || "",
        assigned_to: p.assigned_to || "", priority: p.priority || "Medium",
      });
      const ups = await base44.entities.ProblemUpdate.filter({ problem_id: id }, "-created_date", 100);
      setUpdates(ups);
    } catch (err) {
      setProblem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    base44.entities.Department.list().then(setDepartments).catch(() => {});
    const unsub = base44.entities.ProblemUpdate.subscribe(() => load());
    return () => { if (unsub) unsub(); };
  }, [id]);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setActing(true);
    setError("");
    try {
      let resolution_image_url = problem.resolution_image_url || "";
      if (resolutionImage) {
        const res = await base44.integrations.Core.UploadFile({ file: resolutionImage });
        resolution_image_url = res.file_url;
      }
      const changes = {
        status: adminAction.status,
        department: adminAction.department,
        assigned_to: adminAction.assigned_to,
        priority: adminAction.priority,
        resolution_image_url,
      };
      await base44.entities.Problem.update(id, changes);
      if (adminAction.comment || adminAction.status !== problem.status) {
        await base44.entities.ProblemUpdate.create({
          problem_id: id,
          status: adminAction.status,
          comment: adminAction.comment || `Status updated to ${adminAction.status}`,
          image_url: resolution_image_url || "",
        });
      }
      // Notify the citizen
      try {
        await base44.entities.Notification.create({
          user_id: problem.created_by_id,
          problem_id: id,
          message: `Your report "${problem.title}" was updated to "${adminAction.status}".`,
          type: "status_update",
          read: false,
        });
      } catch {}
      await load();
      setAdminAction((a) => ({ ...a, comment: "" }));
      setResolutionImage(null);
    } catch (err) {
      setError(err.message || "Failed to update.");
    } finally {
      setActing(false);
    }
  };

  const confirmations = problem?.confirmations || [];
  const myConfirm = !!user?.id && confirmations.includes(user.id);

  const handleConfirm = async () => {
    if (!user?.id || !problem) return;
    const next = myConfirm ? confirmations.filter((uid) => uid !== user.id) : [...confirmations, user.id];
    setProblem({ ...problem, confirmations: next });
    try {
      await base44.entities.Problem.update(id, { confirmations: next });
    } catch {
      await load();
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await base44.entities.ProblemUpdate.create({
        problem_id: id,
        comment: comment.trim(),
        author_id: user?.id || "",
        author_name: user?.full_name || "Citizen",
      });
      if (problem.created_by_id && problem.created_by_id !== user?.id) {
        try {
          await base44.entities.Notification.create({
            user_id: problem.created_by_id,
            problem_id: id,
            message: `${user?.full_name || "Someone"} commented on your report "${problem.title}".`,
            type: "comment",
            read: false,
          });
        } catch {}
      }
      setComment("");
      await load();
    } catch {
      setError("Failed to post comment.");
    } finally {
      setCommenting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: problem.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const Layout = isAdmin ? AdminLayout : CitizenLayout;

  if (loading) {
    return <Layout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div></Layout>;
  }
  if (!problem) {
    return (
      <Layout>
        <div className="text-center py-20">
          <AlertCircle className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Problem not found.</p>
          <Link to={isAdmin ? "/admin/problems" : "/my-problems"} className="text-blue-600 text-sm mt-2 inline-block">Go back</Link>
        </div>
      </Layout>
    );
  }

  const currentStep = STATUS_FLOW.indexOf(problem.status);

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Report submitted successfully!</p>
            <p className="text-sm text-green-700">Your Problem ID is <span className="font-mono font-semibold">{problem.problem_id}</span>. Keep it to track your report.</p>
            <button onClick={() => setShowSuccess(false)} className="text-xs text-green-700 underline mt-1">Dismiss</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {problem.image_url && (
              <div className="w-full h-64 bg-slate-100">
                <Image src={problem.image_url} fittingType="fill" className="w-full h-full" alt={problem.title} />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={problem.category} size={20} />
                  <span className="text-sm text-slate-500">{problem.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={problem.status} />
                  <PriorityBadge priority={problem.priority} />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-3">{problem.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                <span className="font-mono">{problem.problem_id}</span>
                <span>·</span>
                <span>{format(new Date(problem.created_date), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
              <p className="text-slate-700 mt-4 whitespace-pre-wrap">{problem.description}</p>

              <div className="flex items-center gap-2 mt-5">
                <Button variant={myConfirm ? "default" : "outline"} size="sm" onClick={handleConfirm}>
                  <ThumbsUp size={14} /> I face this too{confirmations.length > 0 ? ` (${confirmations.length})` : ""}
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 size={14} /> {copied ? "Link copied!" : "Share"}
                </Button>
              </div>

              {problem.address && (
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" /> {problem.address}
                </div>
              )}
              {problem.latitude && problem.longitude && (
                <div className="mt-4">
                  <MapView problems={[problem]} center={[problem.latitude, problem.longitude]} height="280px" />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-blue-500" />
                      {problem.latitude.toFixed(6)}, {problem.longitude.toFixed(6)}
                    </span>
                    {problem.geo_timestamp && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-green-500" />
                        Captured {format(new Date(problem.geo_timestamp), "MMM d, yyyy 'at' h:mm:ss a")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Status Timeline</h2>
            <div className="flex items-center justify-between mb-6">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center relative">
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${i < currentStep ? "bg-green-500" : "bg-slate-200"}`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${i <= currentStep ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {i <= currentStep ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1.5 text-center ${i <= currentStep ? "text-slate-700 font-medium" : "text-slate-400"}`}>{s}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {updates.length === 0 && <p className="text-sm text-slate-400">No updates yet.</p>}
              {updates.map((u) => (
                <div key={u.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {u.author_name && <span className="text-xs font-medium text-blue-700">{u.author_name}</span>}
                      {u.status && <StatusBadge status={u.status} />}
                      <span className="text-xs text-slate-400">{format(new Date(u.created_date), "MMM d, h:mm a")}</span>
                    </div>
                    {u.comment && <p className="text-sm text-slate-600 mt-1">{u.comment}</p>}
                    {u.image_url && <Image src={u.image_url} fittingType="fit" className="mt-2 rounded-lg max-h-40" alt="update" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="text-sm"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleComment} disabled={commenting || !comment.trim()}>
                  {commenting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Post comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500 flex items-center gap-1.5"><Building2 size={14} /> Department</dt><dd className="font-medium text-slate-700">{problem.department || "Unassigned"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 flex items-center gap-1.5"><User size={14} /> Assigned to</dt><dd className="font-medium text-slate-700">{problem.assigned_to || "Unassigned"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 flex items-center gap-1.5"><Clock size={14} /> Reported</dt><dd className="font-medium text-slate-700">{format(new Date(problem.created_date), "MMM d, yyyy")}</dd></div>
              {problem.geo_timestamp && <div className="flex justify-between"><dt className="text-slate-500 flex items-center gap-1.5"><Clock size={14} /> GPS captured</dt><dd className="font-medium text-slate-700 text-right">{format(new Date(problem.geo_timestamp), "MMM d, h:mm a")}</dd></div>}
              {problem.latitude && problem.longitude && <div className="flex justify-between"><dt className="text-slate-500 flex items-center gap-1.5"><MapPin size={14} /> Coordinates</dt><dd className="font-mono text-xs text-slate-700 text-right">{problem.latitude.toFixed(4)}, {problem.longitude.toFixed(4)}</dd></div>}
              {(problem.address || resolvedAddress) && <div className="flex justify-between"><dt className="text-slate-500 flex items-center gap-1.5"><MapPin size={14} /> Address</dt><dd className="font-medium text-slate-700 text-right max-w-[60%]">{problem.address || resolvedAddress}</dd></div>}
            </dl>
            {problem.resolution_image_url && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1.5">Resolution Photo</p>
                <Image src={problem.resolution_image_url} fittingType="fill" className="w-full h-32 rounded-lg" alt="resolution" />
              </div>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <form onSubmit={handleAdminSubmit} className="bg-white rounded-2xl border border-blue-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Manage Problem</h3>
              {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-3"><AlertCircle size={14} /> {error}</div>}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={adminAction.status} onChange={(e) => setAdminAction((a) => ({ ...a, status: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                    {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <select value={adminAction.priority} onChange={(e) => setAdminAction((a) => ({ ...a, priority: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                      {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Department</Label>
                    <select value={adminAction.department} onChange={(e) => setAdminAction((a) => ({ ...a, department: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">None</option>
                      {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Assign to (worker)</Label>
                  <Input value={adminAction.assigned_to} onChange={(e) => setAdminAction((a) => ({ ...a, assigned_to: e.target.value }))} placeholder="Worker name" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Comment</Label>
                  <Textarea value={adminAction.comment} onChange={(e) => setAdminAction((a) => ({ ...a, comment: e.target.value }))} placeholder="Add an update note..." rows={2} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Resolution Photo</Label>
                  <label className="flex items-center gap-2 mt-1 h-9 px-3 border border-input rounded-md cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
                    <Camera size={14} /> {resolutionImage ? resolutionImage.name : "Upload photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setResolutionImage(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <Button type="submit" disabled={acting} className="w-full bg-blue-700 hover:bg-blue-800">
                  {acting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Update Problem
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}