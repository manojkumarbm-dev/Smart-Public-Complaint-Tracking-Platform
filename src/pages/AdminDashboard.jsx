import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44, canonicalComplaintStatus, formatComplaintStatus } from "@/api/base44Client";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import ProblemCard from "@/components/ProblemCard";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ClipboardList, Clock, Loader2, CheckCircle2, Inbox, TrendingUp, ArrowRight, Save, RotateCcw, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";

const PIE_COLORS = ["#2563eb", "#4f46e5", "#d97706", "#ea580c", "#16a34a", "#64748b"];

export default function AdminDashboard() {
  const [problems, setProblems] = useState([]);
  const [completedProblems, setCompletedProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineSettings, setTimelineSettings] = useState(null);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [timelineFeedback, setTimelineFeedback] = useState("");
  const [timelineError, setTimelineError] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Problem.list("-created_date", 500),
      base44.entities.Problem.completed({}, "-completed_at", 500),
    ])
      .then(([active, completed]) => {
        setProblems(active);
        setCompletedProblems(completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    base44.timelineSettings.get().then(setTimelineSettings).catch(() => setTimelineError("Unable to load timeline settings."));
  }, []);

  const updateStage = (status, changes) => {
    setTimelineSettings((current) => ({
      ...current,
      stages: current.stages.map((stage) => stage.status === status ? { ...stage, ...changes } : stage),
    }));
  };

  const handleTimelineSave = async (event) => {
    event.preventDefault();
    setSavingTimeline(true);
    setTimelineError("");
    setTimelineFeedback("");
    try {
      const saved = await base44.timelineSettings.update(timelineSettings);
      setTimelineSettings(saved);
      setTimelineFeedback("Timeline settings saved.");
    } catch (error) {
      setTimelineError(error.message || "Unable to save timeline settings.");
    } finally {
      setSavingTimeline(false);
    }
  };

  const handleTimelineReset = async () => {
    setSavingTimeline(true);
    setTimelineError("");
    setTimelineFeedback("");
    try {
      const reset = await base44.timelineSettings.reset();
      setTimelineSettings(reset);
      setTimelineFeedback("Default timeline settings restored.");
    } catch (error) {
      setTimelineError(error.message || "Unable to reset timeline settings.");
    } finally {
      setSavingTimeline(false);
    }
  };

  const countStatuses = (statuses) => problems.filter((problem) => statuses.includes(canonicalComplaintStatus(problem.status))).length;
  const stats = {
    total: problems.length + completedProblems.length,
    pendingVerification: countStatuses(["SUBMITTED", "UNDER_VERIFICATION"]),
    pendingApproval: countStatuses(["APPROVED_PENDING"]),
    awaitingDepartmentAssignment: countStatuses(["ASSIGNED_TO_DEPARTMENT"]),
    awaitingOfficerAssignment: countStatuses(["OFFICER_ASSIGNMENT_PENDING", "OFFICER_ASSIGNED"]),
    underInvestigation: countStatuses(["INVESTIGATION_IN_PROGRESS"]),
    pendingResolution: countStatuses(["RESOLUTION_PENDING", "RESOLUTION_PENDING_VERIFICATION", "FINAL_REVIEW"]),
    resolved: countStatuses(["RESOLVED"]),
    overdue: problems.filter((p) => p.current_stage_deadline && new Date(p.current_stage_deadline) < new Date() && canonicalComplaintStatus(p.status) !== "RESOLVED").length,
    escalated: countStatuses(["ESCALATED"]),
    completed: completedProblems.length,
  };

  const byCategory = CATEGORIES.map((c) => ({
    name: c,
    value: problems.filter((p) => p.category === c).length,
  })).filter((d) => d.value > 0);

  const byStatus = ["SUBMITTED", "UNDER_VERIFICATION", "APPROVED_PENDING", "ASSIGNED_TO_DEPARTMENT", "OFFICER_ASSIGNED", "INVESTIGATION_IN_PROGRESS", "IN_PROGRESS", "RESOLUTION_PENDING", "RESOLUTION_PENDING_VERIFICATION", "FINAL_REVIEW", "ESCALATED", "RESOLVED", "COMPLETED"].map((status) => ({
    name: formatComplaintStatus(status),
    value: status === "COMPLETED" ? completedProblems.length : countStatuses([status]),
  }));

  const recent = problems.slice(0, 5);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of all reported public problems.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Total Complaints" value={stats.total} color="blue" />
        <StatCard icon={Inbox} label="Pending Verification" value={stats.pendingVerification} color="amber" />
        <StatCard icon={Clock} label="Pending Approval" value={stats.pendingApproval} color="violet" />
        <StatCard icon={Loader2} label="Under Investigation" value={stats.underInvestigation} color="orange" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} color="green" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Clock} label="Awaiting Department" value={stats.awaitingDepartmentAssignment} color="slate" />
        <StatCard icon={Clock} label="Awaiting Officer" value={stats.awaitingOfficerAssignment} color="violet" />
        <StatCard icon={TrendingUp} label="Pending Resolution" value={stats.pendingResolution} color="pink" />
        <StatCard icon={TrendingUp} label="Escalated" value={stats.escalated} color="red" />
        <StatCard icon={Clock} label="Overdue" value={stats.overdue} color="red" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="green" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Timeline Management</h2>
            <p className="text-sm text-slate-500 mt-1">Set the allowed duration for each complaint stage.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleTimelineReset} disabled={!timelineSettings || savingTimeline}>
              <RotateCcw size={15} /> Reset defaults
            </Button>
            <Button type="submit" form="timeline-settings-form" disabled={!timelineSettings || savingTimeline}>
              {savingTimeline ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save changes
            </Button>
          </div>
        </div>

        {timelineError && <p role="alert" className="flex items-center gap-2 text-sm text-red-700 mb-3"><AlertCircle size={15} />{timelineError}</p>}
        {timelineFeedback && <p role="status" className="text-sm text-green-700 mb-3">{timelineFeedback}</p>}
        {!timelineSettings ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6"><Loader2 size={16} className="animate-spin" /> Loading timeline settings...</div>
        ) : (
          <form id="timeline-settings-form" onSubmit={handleTimelineSave}>
            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {timelineSettings.stages.map((stage) => (
                <div key={stage.status} className="grid grid-cols-[minmax(0,1fr)_112px_72px] sm:grid-cols-[minmax(0,1fr)_140px_80px] items-center gap-3 py-3">
                  <Label htmlFor={`duration-${stage.status}`} className="text-sm font-medium text-slate-700">{stage.label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`duration-${stage.status}`}
                      type="number"
                      min="1"
                      step="1"
                      required
                      disabled={!stage.enabled}
                      value={stage.durationDays}
                      onChange={(event) => updateStage(stage.status, { durationDays: event.target.value === "" ? "" : Number(event.target.value) })}
                      className="h-9"
                      aria-label={`${stage.label} allowed duration in days`}
                    />
                    <span className="text-xs text-slate-500">days</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-500">{stage.enabled ? "On" : "Off"}</span>
                    <Switch checked={stage.enabled} onCheckedChange={(enabled) => updateStage(stage.status, { enabled })} aria-label={`${stage.label} enabled`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-5">
              <div className="space-y-1.5">
                <Label htmlFor="escalation-name">Higher authority</Label>
                <Input id="escalation-name" value={timelineSettings.escalationContact.name} onChange={(event) => setTimelineSettings((current) => ({ ...current, escalationContact: { ...current.escalationContact, name: event.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="escalation-email">Contact email</Label>
                <Input id="escalation-email" type="email" value={timelineSettings.escalationContact.email} onChange={(event) => setTimelineSettings((current) => ({ ...current, escalationContact: { ...current.escalationContact, email: event.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="escalation-phone">Contact phone</Label>
                <Input id="escalation-phone" type="tel" value={timelineSettings.escalationContact.phone} onChange={(event) => setTimelineSettings((current) => ({ ...current, escalationContact: { ...current.escalationContact, phone: event.target.value } }))} />
              </div>
            </div>
          </form>
        )}
      </section>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-600" /> Reports by Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Reports by Category</h3>
            {byCategory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-20">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Reports</h2>
        <Link to="/admin/problems" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {recent.map((p) => <ProblemCard key={p.id} problem={p} />)}
      </div>

      {completedProblems.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Completed Complaints</h2>
            <span className="text-sm text-slate-500">{completedProblems.length} archived</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {completedProblems.slice(0, 4).map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
          </div>
        </section>
      )}
    </AdminLayout>
  );
}