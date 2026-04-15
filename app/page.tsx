"use client";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

const features = [
  {
    icon: "⚡",
    title: "One shortcut",
    desc: "Press ⌘+Shift+X on any job page. Works on LinkedIn, Indeed, Greenhouse, Lever, Workday, and 50+ more.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: "🤖",
    title: "AI extraction",
    desc: "Automatically pulls job title, company, location, required skills, and experience level from the listing.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: "📊",
    title: "Live dashboard",
    desc: "See your pipeline, activity chart, top skills, and response rates — updated instantly.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: "🔄",
    title: "Status tracking",
    desc: "Move applications through Applied → Phone Screen → Interview → Offer with one click.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: "📅",
    title: "Follow-up reminders",
    desc: "Set a follow-up date when logging. Never forget to follow up on an application again.",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    icon: "📥",
    title: "CSV export",
    desc: "Export all your data anytime. Your data is always yours — no lock-in.",
    gradient: "from-rose-500 to-pink-600",
  },
];

const steps = [
  { n: "1", title: "Install the extension", desc: "Add JobTrack to Chrome in one click. No signup required to try." },
  { n: "2", title: "Connect your account", desc: "Create a free account and link it to the extension in seconds." },
  { n: "3", title: "Start applying", desc: "Press ⌘+Shift+X on any job page. That's it — we handle the rest." },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <div style={{ background: "var(--bg)", color: "var(--text-1)", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
        className="sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black italic text-sm shadow-md"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>J+</div>
            <span className="font-extrabold text-xl tracking-tight" style={{ color: "var(--text-1)" }}>
              JobTrack
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
              title="Toggle theme">
              {dark ? "☀️" : "🌙"}
            </button>
            <Link href="/auth"
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ color: "var(--text-2)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              Sign in
            </Link>
            <Link href="/auth?mode=signup"
              className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>
              Get started free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-24 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-[120px]"
            style={{ background: "radial-gradient(ellipse,#6e7fc4 0%,#5a6ab0 40%,#0f172a 70%)" }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative animate-fade-up">
          <div className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "rgba(6,182,212,0.1)", color: "#6e7fc4", border: "1px solid rgba(6,182,212,0.25)" }}>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-dot" />
            Free Chrome Extension · No credit card required
          </div>

          <h1 className="text-6xl font-black tracking-tight leading-[1.08] mb-7"
            style={{ color: "var(--text-1)" }}>
            Log any job application<br />
            <span style={{ background: "linear-gradient(135deg,#6e7fc4,#9c8fc4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              in one keystroke
            </span>
          </h1>

          <p className="text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-2)" }}>
            Press{" "}
            <kbd className="px-2 py-1 rounded-lg text-sm font-mono font-bold"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)", boxShadow: "0 2px 0 var(--border)" }}>
              ⌘ Shift X
            </kbd>
            {" "}on any job page. JobTrack scrapes the details, runs AI analysis, and saves it to your dashboard instantly.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/auth?mode=signup"
              className="px-8 py-4 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 text-base"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>
              Create free account →
            </Link>
            <a href="#how"
              className="px-8 py-4 font-semibold rounded-2xl transition-all text-base hover:-translate-y-0.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)", boxShadow: "var(--shadow-sm)" }}>
              How it works
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {["30+ job boards", "AI-powered", "Free forever", "Privacy-first"].map(b => (
              <span key={b} className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                <span className="text-green-500">✓</span> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-1)" }}>
              Everything you need
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-2)" }}>
              No spreadsheet setup. No manual data entry. Just apply and let JobTrack handle the rest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={f.title}
                className="p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg group"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 60}ms`,
                }}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${f.gradient} shadow-md group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-1)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-1)" }}>
              Up and running in 3 steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-4 shadow-lg"
                  style={{ background: "linear-gradient(135deg,#6e7fc4,#7c3aed)" }}>
                  {s.n}
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-1)" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 right-0 translate-x-1/2 text-2xl" style={{ color: "var(--text-3)" }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-1)" }}>
            Start tracking today
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--text-2)" }}>
            Free forever. No credit card required.
          </p>
          <Link href="/auth?mode=signup"
            className="inline-block px-10 py-4 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all text-base"
            style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>
            Create your free account →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
        className="py-8 text-center text-sm">
        <span style={{ color: "var(--text-3)" }}>
          © 2026 JobTrack &nbsp;·&nbsp;
          <a href="/privacy-policy" className="hover:underline" style={{ color: "var(--text-3)" }}>Privacy Policy</a>
          &nbsp;·&nbsp;
          <a href="https://github.com/Prannay-tech/jobtrack-extension" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ color: "var(--text-3)" }}>GitHub</a>
        </span>
      </footer>
    </div>
  );
}
