import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CitizenLayout from "@/components/CitizenLayout";
import StatCard from "@/components/StatCard";
import ProblemCard from "@/components/ProblemCard";
import { PlusCircle, ClipboardList, CheckCircle2, Loader2, Activity } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Problem.filter({ created_by_id: user.id }, "-created_date", 50)
      .then(setProblems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const stats = {
    total: problems.length,
    pending: problems.filter((p) => ["Submitted", "Verified", "Assigned"].includes(p.status)).length,
    inProgress: problems.filter((p) => p.status === "In Progress").length,
    resolved: problems.filter((p) => ["Resolved", "Closed"].includes(p.status)).length,
  };

  const recent = problems.slice(0, 4);

  return (
    <CitizenLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back{user?.full_name ? `, ${user.full_name}` : ""} 👋</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your reported problems.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ClipboardList} label="Total Reports" value={stats.total} color="blue" />
        <StatCard icon={Activity} label="Pending" value={stats.pending} color="amber" />
        <StatCard icon={Loader2} label="In Progress" value={stats.inProgress} color="orange" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} color="green" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Reports</h2>
        <Link to="/report" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
          <PlusCircle size={16} /> New Report
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : recent.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900">No reports yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Report your first public problem to get started.</p>
          <Link to="/report" className="inline-flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800">
            <PlusCircle size={16} /> Report a Problem
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {recent.map((p) => <ProblemCard key={p.id} problem={p} />)}
        </div>
      )}
    </CitizenLayout>
  );
}