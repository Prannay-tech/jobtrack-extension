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

  const [mode, setMode]         = useState<"signin" | "signup" | "forgot">(
    searchParams.get("mode") === "signup" ? "signup" : searchParams.get("mode") === "forgot" ? "forgot" : "signin"
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
      else setMsg("Account created! You can now sign in.");
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://jobtrack-web-prannay-khushalanis-projects.vercel.app/auth/reset?next=${next}`,
      });
      if (error) setError(error.message);
      else setMsg("Password reset link sent to your email. Check your inbox!");
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

          {/* Note: Google OAuth available after Supabase config */}

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
            {mode !== "forgot" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5" }}>
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(""); setMsg(""); setPassword(""); }}
                      className="text-xs font-bold hover:underline"
                      style={{ color: "#6e7fc4" }}>
                      Forgot?
                    </button>
                  )}
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = "#6e7fc4"; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,245,.15)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  placeholder="••••••••" minLength={6} />
              </div>
            )}

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
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
            {mode === "signin" ? "Don't have an account? " : mode === "signup" ? "Already have an account? " : "Remember your password? "}
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMsg(""); }}
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
