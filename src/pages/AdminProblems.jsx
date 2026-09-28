import React, { useEffect, useState } from "react";
import { base44, formatComplaintStatus } from "@/api/base44Client";
import AdminLayout from "@/components/AdminLayout";
import ProblemCard from "@/components/ProblemCard";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ClipboardList } from "lucide-react";

const STATUSES = ["Submitted", "Under Verification", "Approved Pending", "Assigned to Department", "Officer Assigned", "Investigation in Progress", "In Progress", "Resolution Pending", "Resolution Pending Verification", "Final Review", "Resolved", "Escalated"];

export default function AdminProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  useEffect(() => {
    base44.entities.Problem.list("-created_date", 500)
      .then(setProblems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = problems.filter((p) => {
    if (statusFilter !== "All" && formatComplaintStatus(p.status) !== statusFilter) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (priorityFilter !== "All" && p.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.problem_id?.toLowerCase().includes(q) && !p.address?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Problem Management</h1>
      <p className="text-slate-500 mb-6">Verify, assign, and resolve reported problems.</p>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, ID, address" className="pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="All">All Priorities</option>
          {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="text-sm text-slate-500 mb-3">{filtered.length} problems</div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <ClipboardList className="text-slate-300 mx-auto mb-3" size={40} />
          <p className="text-slate-500">No problems match your filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((p) => <ProblemCard key={p.id} problem={p} />)}
        </div>
      )}
    </AdminLayout>
  );
}