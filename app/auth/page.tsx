"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const [mode, setMode]         = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [msg, setMsg]           = useState("");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMsg("");

    const next = searchParams.get("next") || "/dashboard";

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMsg("Check your email for a confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push(next);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1.5px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-1)",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
  } as React.CSSProperties;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>

      {/* Theme toggle — top right */}
      <button onClick={toggle}
        className="fixed top-5 right-5 w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80 text-lg"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        {dark ? "☀️" : "🌙"}
      </button>

      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black italic text-base shadow-lg"
            style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>J+</div>
          <span className="font-extrabold text-2xl tracking-tight" style={{ color: "var(--text-1)" }}>JobTrack</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>

          <h1 className="text-2xl font-extrabold mb-1 tracking-tight" style={{ color: "var(--text-1)" }}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-3)" }}>
            {mode === "signin" ? "Sign in to view your dashboard" : "Free forever. No credit card required."}
          </p>

          {/* Google OAuth */}
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80 mb-5"
            style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text-1)" }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.4-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.2 5.2C41.2 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                Email
              </label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#6e7fc4"; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,245,.15)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                Password
              </label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#6e7fc4"; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,245,.15)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                placeholder="••••••••" minLength={6} />
            </div>

            {error && (
              <div className="text-sm px-4 py-3 rounded-xl" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
                {error}
              </div>
            )}
            {msg && (
              <div className="text-sm px-4 py-3 rounded-xl font-medium" style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
                ✅ {msg}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 text-white font-bold rounded-xl transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-60 disabled:translate-y-0 shadow-lg"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMsg(""); }}
              className="font-bold hover:underline" style={{ color: "#6e7fc4" }}>
              {mode === "signin" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-3)" }}>
          By continuing, you agree to our{" "}
          <a href="/privacy-policy" className="hover:underline" style={{ color: "#6e7fc4" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
