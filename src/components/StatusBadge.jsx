import React from "react";
import { cn } from "@/lib/utils";
import { formatComplaintStatus } from "@/api/base44Client";

const STATUS_STYLES = {
  "Submitted": "bg-blue-100 text-blue-700 border-blue-200",
  "Under Verification": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Approved Pending": "bg-violet-100 text-violet-700 border-violet-200",
  "Assigned to Department": "bg-amber-100 text-amber-700 border-amber-200",
  "Officer Assigned": "bg-amber-100 text-amber-700 border-amber-200",
  "Investigation in Progress": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "In Progress": "bg-orange-100 text-orange-700 border-orange-200",
  "Resolution Pending": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Resolution Pending Verification": "bg-pink-100 text-pink-700 border-pink-200",
  "Final Review": "bg-slate-200 text-slate-700 border-slate-300",
  "Escalated": "bg-red-100 text-red-700 border-red-200",
  "Resolved": "bg-green-100 text-green-700 border-green-200",
  "Completed": "bg-green-100 text-green-800 border-green-300",
  "Closed": "bg-slate-100 text-slate-600 border-slate-200",
  "Delayed": "bg-rose-100 text-rose-700 border-rose-200",
  "Rejected": "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_STYLES = {
  "Low": "bg-slate-100 text-slate-600 border-slate-200",
  "Medium": "bg-blue-100 text-blue-700 border-blue-200",
  "High": "bg-orange-100 text-orange-700 border-orange-200",
  "Urgent": "bg-red-100 text-red-700 border-red-200",
};

export function StatusBadge({ status, className }) {
  const resolvedStatus = formatComplaintStatus(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      STATUS_STYLES[resolvedStatus] || "bg-slate-100 text-slate-600 border-slate-200",
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {resolvedStatus}
    </span>
  );
}

export function PriorityBadge({ priority, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
      PRIORITY_STYLES[priority] || PRIORITY_STYLES["Medium"],
      className
    )}>
      {priority}
    </span>
  );
}