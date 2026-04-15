"use client";
import { Application, STATUS_COLORS, STATUS_CYCLE } from "@/lib/types";
import { useState } from "react";

interface Props {
  apps: Application[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export default function AppTable({ apps, onStatusChange, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cyclingId, setCyclingId]   = useState<string | null>(null);

  function nextStatus(current: string) {
    const idx = STATUS_CYCLE.indexOf(current as any);
    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  }

  async function handleStatus(app: Application) {
    if (cyclingId === app.id) return;
    setCyclingId(app.id);
    await onStatusChange(app.id, nextStatus(app.status));
    setCyclingId(null);
  }

  async function handleDelete(app: Application) {
    if (!confirm(`Delete "${app.title}" at ${app.company}?`)) return;
    setDeletingId(app.id);
    await onDelete(app.id);
    setDeletingId(null);
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>

      {/* Table header */}
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
        <div className="grid items-center text-xs font-bold uppercase tracking-wider"
          style={{ gridTemplateColumns: "90px 1fr 120px 180px 130px 36px", color: "var(--text-3)" }}>
          <span>Date</span>
          <span>Role</span>
          <span className="hidden md:block">Location</span>
          <span className="hidden lg:block">Skills</span>
          <span>Status</span>
          <span />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {apps.map((app, i) => {
          const colors  = STATUS_COLORS[app.status] || STATUS_COLORS["Applied"];
          const cycling = cyclingId === app.id;
          const deleting = deletingId === app.id;

          return (
            <div key={app.id}
              className="px-5 py-3.5 grid items-center transition-all hover:bg-opacity-50"
              style={{
                gridTemplateColumns: "90px 1fr 120px 180px 130px 36px",
                background: deleting ? "rgba(220,38,38,0.04)" : i % 2 !== 0 ? "var(--surface-2)" : "transparent",
                opacity: deleting ? 0.5 : 1,
              }}>

              {/* Date */}
              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-3)" }}>
                {app.date}
              </span>

              {/* Role */}
              <div className="min-w-0 pr-4">
                <a href={app.url} target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-sm block truncate hover:underline transition-colors"
                  style={{ color: "var(--text-1)" }}>
                  {app.title}
                </a>
                <span className="text-xs block truncate font-medium" style={{ color: "#6e7fc4" }}>
                  {app.company}
                </span>
                {app.brief && (
                  <span className="text-xs block truncate mt-0.5 italic" style={{ color: "var(--text-3)" }}>
                    {app.brief}
                  </span>
                )}
              </div>

              {/* Location */}
              <div className="hidden md:block">
                {app.location ? (
                  <span className="text-xs px-2 py-1 rounded-lg font-medium"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                    📍 {app.location}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-3)" }} className="text-xs">—</span>
                )}
              </div>

              {/* Skills */}
              <div className="hidden lg:flex flex-wrap gap-1 max-w-[180px]">
                {(app.skills || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 3).map(s => (
                  <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
                    {s}
                  </span>
                ))}
              </div>

              {/* Status badge */}
              <button
                onClick={() => handleStatus(app)}
                disabled={cycling}
                className="text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:opacity-80 hover:scale-105 active:scale-95 whitespace-nowrap"
                style={{ background: colors.bg, color: colors.text, borderColor: colors.border, opacity: cycling ? 0.6 : 1 }}>
                {cycling ? "…" : app.status}
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(app)}
                disabled={deleting}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-100 opacity-30 hover:bg-red-50"
                style={{ color: "#dc2626" }}
                title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t text-xs font-medium flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text-3)" }}>
        <span>{apps.length} application{apps.length !== 1 ? "s" : ""}</span>
        <span>Click a status badge to cycle it</span>
      </div>
    </div>
  );
}
