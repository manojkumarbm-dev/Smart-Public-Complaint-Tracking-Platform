import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, ThumbsUp } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Image } from "@/components/ui/image";
import { formatDistanceToNow } from "date-fns";

export default function ProblemCard({ problem }) {
  const created = problem.created_date ? new Date(problem.created_date) : null;
  return (
    <Link
      to={`/problems/${problem.id}`}
      className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200"
    >
      <div className="flex gap-4 p-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
          {problem.image_url ? (
            <Image src={problem.image_url} fittingType="fill" className="w-full h-full" alt={problem.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <CategoryIcon category={problem.category} size={28} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
              {problem.title}
            </h3>
            <StatusBadge status={problem.status} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <CategoryIcon category={problem.category} size={16} />
            <span className="text-sm text-slate-500">{problem.category}</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-mono text-slate-400">{problem.problem_id}</span>
            {problem.confirmations?.length > 0 && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <ThumbsUp size={12} /> {problem.confirmations.length}
              </span>
            )}
          </div>
          {problem.address && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <MapPin size={12} />
              <span className="truncate">{problem.address}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <PriorityBadge priority={problem.priority} />
            {created && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {formatDistanceToNow(created, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}