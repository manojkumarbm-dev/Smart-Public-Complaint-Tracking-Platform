import React from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  "Submitted": "bg-blue-100 text-blue-700 border-blue-200",
  "Verified": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Assigned": "bg-amber-100 text-amber-700 border-amber-200",
  "In Progress": "bg-orange-100 text-orange-700 border-orange-200",
  "Resolved": "bg-green-100 text-green-700 border-green-200",
  "Closed": "bg-slate-100 text-slate-600 border-slate-200",
};

const PRIORITY_STYLES = {
  "Low": "bg-slate-100 text-slate-600 border-slate-200",
  "Medium": "bg-blue-100 text-blue-700 border-blue-200",
  "High": "bg-orange-100 text-orange-700 border-orange-200",
  "Urgent": "bg-red-100 text-red-700 border-red-200",
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200",
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
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