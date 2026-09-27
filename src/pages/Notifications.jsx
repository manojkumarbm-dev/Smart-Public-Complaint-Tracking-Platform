import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CitizenLayout from "@/components/CitizenLayout";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    try {
      const n = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 100);
      setNotifications(n);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.id]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    await base44.entities.Notification.bulkUpdate(unread.map((n) => ({ id: n.id, read: true })));
    load();
  };

  const markRead = async (n) => {
    if (n.read) return;
    await base44.entities.Notification.update(n.id, { read: true });
    load();
  };

  return (
    <CitizenLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Updates on your reported problems.</p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button onClick={markAllRead} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Bell className="text-slate-300 mx-auto mb-3" size={40} />
          <p className="text-slate-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.problem_id ? `/problems/${n.problem_id}` : "/notifications"}
              onClick={() => markRead(n)}
              className={cn("flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors", !n.read && "bg-blue-50/40")}
            >
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", n.read ? "bg-slate-100" : "bg-blue-100")}>
                <Bell size={16} className={n.read ? "text-slate-400" : "text-blue-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", n.read ? "text-slate-600" : "text-slate-900 font-medium")}>{n.message}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </CitizenLayout>
  );
}