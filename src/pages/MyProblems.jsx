import React, { useEffect, useState } from "react";
import { base44, formatComplaintStatus } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CitizenLayout from "@/components/CitizenLayout";
import ProblemCard from "@/components/ProblemCard";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Loader2, Search, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function MyProblems() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [completedProblems, setCompletedProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      base44.entities.Problem.filter({ created_by_id: user.id }, "-created_date", 200),
      base44.entities.Problem.completed({ created_by_id: user.id }, "-completed_at", 200),
    ])
      .then(([active, completed]) => {
        setProblems(active);
        setCompletedProblems(completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = problems.filter((p) => {
    if (statusFilter !== "All" && formatComplaintStatus(p.status) !== statusFilter) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.problem_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <CitizenLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">My Problems</h1>
      <p className="text-slate-500 mb-6">All problems you have reported.</p>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or Problem ID" className="pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Statuses</option>
          {["Submitted", "Under Verification", "Approved Pending", "Assigned to Department", "Officer Assigned", "Investigation in Progress", "In Progress", "Resolution Pending", "Resolution Pending Verification", "Final Review", "Resolved", "Escalated"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <ClipboardList className="text-slate-300 mx-auto mb-3" size={40} />
          <p className="text-slate-500">No active problems found matching your filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((p) => <ProblemCard key={p.id} problem={p} />)}
        </div>
      )}

      {completedProblems.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Completed Reports</h2>
            <span className="text-sm text-slate-500">{completedProblems.length}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {completedProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
          </div>
        </section>
      )}
    </CitizenLayout>
  );
}