"use client";
import { Application, STATUS_CYCLE, STATUS_COLORS } from "@/lib/types";

interface Props { apps: Application[]; }

export default function PipelineChart({ apps }: Props) {
  const total   = apps.length || 1;
  const counts  = STATUS_CYCLE.map(s => ({ status: s, count: apps.filter(a => a.status === s).length }));
  const maxCount = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="space-y-3">
      {counts.map(({ status, count }) => {
        const colors = STATUS_COLORS[status];
        const pct    = (count / maxCount) * 100;
        return (
          <div key={status} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{status}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: colors.text }} />
            </div>
            <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
