import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, PlusCircle, List, Map, Bell, LogOut, ShieldCheck, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/report", label: "Report Problem", icon: PlusCircle },
  { to: "/my-problems", label: "My Problems", icon: List },
  { to: "/nearby", label: "Nearby Map", icon: Map },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export default function CitizenLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    if (!user?.id) return;
    let active = true;
    base44.entities.Notification.filter({ user_id: user.id, read: false }, "-created_date", 100)
      .then((r) => { if (active) setUnread(r.length); })
      .catch(() => {});
    const unsub = base44.entities.Notification.subscribe(() => {});
    return () => { active = false; if (unsub) unsub(); };
  }, [user?.id]);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-green-500 flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">SmartCity</div>
            <div className="text-xs text-slate-400">Problem Report</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.label === "Notifications" && unread > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="px-3 py-2 mb-2">
          <div className="text-sm font-medium text-slate-700 truncate">{user?.full_name || user?.email}</div>
          <div className="text-xs text-slate-400">{user?.role === "admin" ? "Administrator" : "Citizen"}</div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-green-500 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-900">SmartCity</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-slate-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</div>
        <div className="px-4 pb-6 lg:px-8 max-w-7xl mx-auto text-xs text-slate-400">
          &copy; 2026 Manoj Kumar B M (manojkumarbm-dev). All rights reserved.
        </div>
      </main>
    </div>
  );
}