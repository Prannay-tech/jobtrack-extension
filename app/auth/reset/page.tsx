"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [checking, setChecking] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // Exchange recovery code for session
    async function verifyRecoveryCode() {
      const code = searchParams.get("code");
      if (!code) {
        setError("Invalid or expired reset link. Please request a new one.");
        setChecking(false);
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          email: "", // Not needed for recovery
          token: code,
          type: "recovery",
        });

        if (error) {
          setError("Invalid or expired reset link. Please request a new one.");
        }
        setChecking(false);
      } catch (err) {
        setError("Failed to verify reset link. Please request a new one.");
        setChecking(false);
      }
    }

    verifyRecoveryCode();
  }, [searchParams]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);

      if (error) {
        setError(error.message || "Failed to reset password. Please request a new reset link.");
      } else {
        setMsg("Password updated! Redirecting to login...");
        const next = searchParams.get("next") || "/dashboard";
        setTimeout(() => {
          // Use stable domain to ensure consistent redirect
          window.location.href = `https://jobtrack-web-prannay-khushalanis-projects.vercel.app/auth?next=${encodeURIComponent(next)}`;
        }, 2000);
      }
    } catch (err) {
      setLoading(false);
      setError("Session expired or invalid. Please request a new password reset link.");
    }
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

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>🔄</div>
          <p style={{ color: "var(--text-2)" }}>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <button onClick={toggle}
        className="fixed top-5 right-5 w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80 text-lg"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        {dark ? "☀️" : "🌙"}
      </button>

      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black italic text-base shadow-lg"
            style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>J+</div>
          <span className="font-extrabold text-2xl tracking-tight" style={{ color: "var(--text-1)" }}>JobTrack</span>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>

          <h1 className="text-2xl font-extrabold mb-1 tracking-tight" style={{ color: "var(--text-1)" }}>
            Reset your password
          </h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-3)" }}>
            Enter a new password below
          </p>

          {error && (
            <div className="text-sm px-4 py-3 rounded-xl mb-5" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
              {error}
            </div>
          )}
          {msg && (
            <div className="text-sm px-4 py-3 rounded-xl font-medium mb-5" style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
              ✅ {msg}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                New Password
              </label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#6e7fc4"; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,245,.15)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                placeholder="••••••••" minLength={6} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                Confirm Password
              </label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#6e7fc4"; e.target.style.boxShadow = "0 0 0 3px rgba(59,111,245,.15)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                placeholder="••••••••" minLength={6} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 text-white font-bold rounded-xl transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-60 disabled:translate-y-0 shadow-lg"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
            Remember your password?{" "}
            <a href="/auth" className="font-bold hover:underline" style={{ color: "#6e7fc4" }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
