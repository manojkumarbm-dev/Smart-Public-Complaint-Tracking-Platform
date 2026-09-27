import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AdminLayout from "@/components/AdminLayout";
import { CATEGORIES } from "@/components/CategoryIcon";
import { Loader2, TrendingUp, PieChart as PieIcon, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";

const PIE_COLORS = ["#2563eb", "#4f46e5", "#d97706", "#ea580c", "#16a34a", "#64748b", "#0891b2", "#7c3aed", "#db2777", "#65a30d"];

export default function Analytics() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Problem.list("-created_date", 500)
      .then(setProblems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byCategory = CATEGORIES.map((c) => ({ name: c, value: problems.filter((p) => p.category === c).length }));
  const byPriority = ["Low", "Medium", "High", "Urgent"].map((p) => ({ name: p, value: problems.filter((pr) => pr.priority === p).length }));
  const byStatus = ["Submitted", "Verified", "Assigned", "In Progress", "Resolved", "Closed"].map((s) => ({ name: s, value: problems.filter((p) => p.status === s).length }));

  // last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const count = problems.filter((p) => {
      const cd = new Date(p.created_date);
      return cd >= d && cd < next;
    }).length;
    days.push({ name: d.toLocaleDateString("en", { weekday: "short" }), reports: count });
  }

  const resolutionRate = problems.length ? Math.round((problems.filter((p) => ["Resolved", "Closed"].includes(p.status)).length / problems.length) * 100) : 0;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Analytics</h1>
      <p className="text-slate-500 mb-6">Insights into problem reports and resolution.</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">Total Reports</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{problems.length}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">Resolution Rate</div>
              <div className="text-3xl font-bold text-green-600 mt-1">{resolutionRate}%</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">Open Reports</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">
                {problems.filter((p) => !["Resolved", "Closed"].includes(p.status)).length}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">This Week</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{days.reduce((a, d) => a + d.reports, 0)}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-600" /> Reports (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={days}>
                  <defs>
                    <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="reports" stroke="#2563eb" fill="url(#c)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" /> By Status</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PieIcon size={18} className="text-blue-600" /> By Category</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">By Priority</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byPriority} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}