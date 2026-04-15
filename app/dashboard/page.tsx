"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, STATUS_COLORS, STATUS_CYCLE } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import ActivityChart from "@/components/charts/ActivityChart";
import PipelineChart from "@/components/charts/PipelineChart";
import SkillsChart   from "@/components/charts/SkillsChart";
import StatsCards    from "@/components/StatsCards";
import AppTable      from "@/components/AppTable";

export default function Dashboard() {
  const router   = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const [apps, setApps]       = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"applications" | "analytics">("applications");
  const [user, setUser]       = useState<{ email?: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUser(user);

      const { data } = await supabase
        .from("applications")
        .select("*")
        .order("date", { ascending: false });
      setApps(data || []);
      setLoading(false);
    }
    load();

    // Real-time subscription
    const channel = supabase
      .channel("applications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setApps(prev => [payload.new as Application, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setApps(prev => prev.map(a => a.id === (payload.new as Application).id ? payload.new as Application : a));
        } else if (payload.eventType === "DELETE") {
          setApps(prev => prev.filter(a => a.id !== (payload.old as Application).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as Application["status"] } : a));
    await supabase.from("applications").update({ status: newStatus }).eq("id", id);
  }

  async function handleDelete(id: string) {
    setApps(prev => prev.filter(a => a.id !== id));
    await supabase.from("applications").delete().eq("id", id);
  }

  function downloadCSV() {
    const headers = ["Date","Company","Job Title","URL","Job Site","Location","Status","Notes","Brief","YOE","Top Skills"];
    const rows    = apps.map(a => [a.date, a.company, a.title, a.url, a.job_site, a.location, a.status, a.notes, a.brief, a.yoe, a.skills]);
    const csv     = [headers, ...rows].map(r => r.map(v => `"${(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob    = new Blob([csv], { type: "text/csv" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a"); a.href = url; a.download = `jobtrack-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const todayStr   = new Date().toISOString().slice(0, 10);
  const todayCount = apps.filter(a => a.date === todayStr).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
        className="sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black italic text-sm shadow-md"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>J+</div>
            <div>
              <div className="font-extrabold text-base leading-none tracking-tight" style={{ color: "var(--text-1)" }}>
                JobTrack
              </div>
              <div className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--text-3)" }}>
                Application Tracker
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {/* Live dot */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>

            <span className="text-sm hidden md:block" style={{ color: "var(--text-3)" }}>
              {user?.email}
            </span>

            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl transition-all hover:opacity-80"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>

            {/* Theme toggle */}
            <button onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
              title={`Switch to ${dark ? "light" : "dark"} mode`}>
              <span className="text-base">{dark ? "☀️" : "🌙"}</span>
            </button>

            <button onClick={handleSignOut}
              className="text-sm font-semibold px-3.5 py-2 rounded-xl transition-all hover:opacity-80"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-7">

        {/* ── Stats ── */}
        <StatsCards apps={apps} todayCount={todayCount} />

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 mt-7 mb-6 p-1 rounded-xl w-fit"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {(["applications", "analytics"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={tab === t
                ? { background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)", color: "#fff", boxShadow: "0 2px 8px rgba(59,111,245,.35)" }
                : { color: "var(--text-3)", background: "transparent" }}>
              {t === "applications" ? "📋 Applications" : "📊 Analytics"}
            </button>
          ))}
        </div>

        {/* ── Applications tab ── */}
        {tab === "applications" && (
          loading
            ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl shimmer" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            )
            : apps.length === 0
              ? (
                <div className="rounded-2xl border-2 border-dashed py-20 text-center"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="text-5xl mb-4">📋</div>
                  <p className="font-bold text-base mb-2" style={{ color: "var(--text-2)" }}>No applications yet</p>
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>
                    Press{" "}
                    <kbd className="px-2 py-0.5 rounded-md text-xs font-mono font-bold"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}>
                      ⌘ Shift X
                    </kbd>
                    {" "}on any job page to log your first application.
                  </p>
                </div>
              )
              : <AppTable apps={apps} onStatusChange={handleStatusChange} onDelete={handleDelete} />
        )}

        {/* ── Analytics tab ── */}
        {tab === "analytics" && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
                  📅 Daily Activity (last 30 days)
                </h3>
                <ActivityChart apps={apps} />
              </div>
              <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
                  🔽 Application Pipeline
                </h3>
                <PipelineChart apps={apps} />
              </div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
                🛠 Top Skills Targeted
              </h3>
              <SkillsChart apps={apps} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
