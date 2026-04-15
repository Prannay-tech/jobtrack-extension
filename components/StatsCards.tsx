"use client";
import { Application } from "@/lib/types";

interface Props { apps: Application[]; todayCount: number; }

export default function StatsCards({ apps, todayCount }: Props) {
  const total      = apps.length;
  const active     = apps.filter(a => !["Rejected"].includes(a.status)).length;
  const offers     = apps.filter(a => a.status === "Offer").length;
  const interviews = apps.filter(a => a.status === "Interview").length;

  function calcStreak() {
    const days = new Set(apps.map(a => a.date));
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  const streak = calcStreak();

  const cards = [
    { label: "Today",    value: todayCount, sub: "applications logged", accent: "#6e7fc4", bg: "rgba(6,182,212,0.1)",    icon: "⚡" },
    { label: "All-time", value: total,      sub: "total applications",  accent: "#9c8fc4", bg: "rgba(129,140,248,0.1)", icon: "📋" },
    { label: "Active",   value: active,     sub: "in pipeline",          accent: "#6e7fc4", bg: "rgba(6,182,212,0.08)", icon: "🔄" },
    { label: "Streak",   value: streak,     sub: streak === 1 ? "day" : "days in a row", accent: "#34d399", bg: "rgba(52,211,153,0.1)", icon: "🔥" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={c.label}
          className="rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            animationDelay: `${i * 60}ms`,
          }}>
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{ background: c.accent }} />
          {/* Icon chip */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
            style={{ background: c.bg }}>
            {c.icon}
          </div>
          <div className="text-4xl font-black leading-none tracking-tight mb-1"
            style={{ color: c.accent }}>
            {c.value}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider mb-0.5"
            style={{ color: "var(--text-3)" }}>
            {c.label}
          </div>
          <div className="text-xs" style={{ color: "var(--text-3)" }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
