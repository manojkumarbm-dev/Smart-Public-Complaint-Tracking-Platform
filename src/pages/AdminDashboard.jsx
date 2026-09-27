import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import ProblemCard from "@/components/ProblemCard";
import { CATEGORIES } from "@/components/CategoryIcon";
import {
  ClipboardList, Clock, Loader2, CheckCircle2, Inbox, TrendingUp, ArrowRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";

const PIE_COLORS = ["#2563eb", "#4f46e5", "#d97706", "#ea580c", "#16a34a", "#64748b"];

export default function AdminDashboard() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Problem.list("-created_date", 500)
      .then(setProblems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: problems.length,
    pending: problems.filter((p) => ["Submitted", "Verified", "Assigned"].includes(p.status)).length,
    inProgress: problems.filter((p) => p.status === "In Progress").length,
    resolved: problems.filter((p) => ["Resolved", "Closed"].includes(p.status)).length,
  };

  const byCategory = CATEGORIES.map((c) => ({
    name: c,
    value: problems.filter((p) => p.category === c).length,
  })).filter((d) => d.value > 0);

  const byStatus = ["Submitted", "Verified", "Assigned", "In Progress", "Resolved", "Closed"].map((s) => ({
    name: s,
    value: problems.filter((p) => p.status === s).length,
  }));

  const recent = problems.slice(0, 5);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of all reported public problems.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ClipboardList} label="Total Reports" value={stats.total} color="blue" />
        <StatCard icon={Inbox} label="Pending" value={stats.pending} color="amber" />
        <StatCard icon={Loader2} label="In Progress" value={stats.inProgress} color="orange" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} color="green" />
      </div>

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
    </AdminLayout>
  );
}