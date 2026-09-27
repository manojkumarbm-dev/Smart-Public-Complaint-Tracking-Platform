import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Camera,
  Bell,
  BarChart3,
} from "lucide-react";
import { CATEGORIES } from "@/components/CategoryIcon";
import { useAuth } from "@/lib/AuthContext";

const FEATURES = [
  { icon: Camera, title: "Report with Photo", desc: "Capture the issue with your phone and submit in seconds." },
  { icon: MapPin, title: "GPS Location", desc: "Precise coordinates help authorities find problems fast." },
  { icon: Bell, title: "Live Tracking", desc: "Follow your report from submission to resolution." },
  { icon: BarChart3, title: "Transparency", desc: "See analytics and progress across your community." },
];

const STEPS = [
  { n: "01", title: "Report", desc: "Submit a problem with photo, category, and location." },
  { n: "02", title: "Track", desc: "Get a unique Problem ID and follow status updates." },
  { n: "03", title: "Resolve", desc: "Authorities verify, assign, and resolve your report." },
];

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-green-500 flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">SmartCity</div>
              <div className="text-xs text-slate-400 -mt-0.5">Problem Report System</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={isAdmin ? "/admin" : "/dashboard"} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">
                  {isAdmin ? "Admin Console" : "My Dashboard"}
                </Link>
                <Link to="/report" className="text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors">
                  Report a Problem
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">
                  Sign in
                </Link>
                <Link to="/register" className="text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 lg:px-8 py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Smart City Governance Platform
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
            Report public problems.<br />
            <span className="bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">Get them resolved.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            A modern way for citizens to report potholes, garbage, broken streetlights and more —
            while authorities track, assign, and resolve issues with full transparency.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded-xl transition-colors">
              Report a Problem <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium px-6 py-3 rounded-xl transition-colors">
              Admin Login
            </Link>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Free for citizens</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Real-time updates</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Transparent process</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
        <h2 className="text-center text-2xl font-bold text-slate-900 mb-2">What can you report?</h2>
        <p className="text-center text-slate-500 mb-8">Ten categories covering the most common public issues.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((c) => (
            <div key={c} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-5 text-center hover:bg-white hover:shadow-md transition-all">
              <div className="text-sm font-medium text-slate-700">{c}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-12">Built for citizens and authorities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="relative">
              <div className="text-5xl font-bold text-blue-100">{s.n}</div>
              <h3 className="text-lg font-semibold text-slate-900 mt-2">{s.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 pb-20">
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-3xl p-10 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/20 rounded-full blur-3xl" />
          <h2 className="relative text-3xl font-bold text-white">Make your city better today</h2>
          <p className="relative text-blue-100 mt-3 max-w-xl mx-auto">Join thousands of citizens improving their communities one report at a time.</p>
          <Link to="/register" className="relative inline-flex items-center gap-2 mt-6 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Create your account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            SmartCity Problem Report System
          </div>
          <div>&copy; 2026 Manoj Kumar B M (manojkumarbm-dev). All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}