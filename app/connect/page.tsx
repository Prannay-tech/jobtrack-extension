"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// This page is opened by the Chrome extension to link accounts.
// Flow: extension opens this page → user signs in → we generate a token
// → page posts token back to the extension via window.opener.postMessage

function ConnectFlow() {
  const searchParams = useSearchParams();
  const extensionId  = searchParams.get("ext"); // extension ID for postMessage
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [tokenData, setTokenData] = useState<{ token: string; email: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function connect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to auth, come back here after
        window.location.href = `/auth?next=/connect${extensionId ? `?ext=${extensionId}` : ""}`;
        return;
      }

      // Generate a token for this user
      const token = crypto.randomUUID();
      const { error } = await supabase.from("extension_tokens").insert({ user_id: user.id, token });

      if (error) { setStatus("error"); return; }

      // Store token data so content script can read it from the DOM
      setTokenData({ token, email: user.email || "" });

      // Also try window.opener.postMessage for popup window flow
      if (window.opener) {
        window.opener.postMessage({ type: "JOBTRACK_TOKEN", token, email: user.email }, "*");
        setTimeout(() => window.close(), 2000);
      }
      setStatus("connected");
    }
    connect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7ff] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black italic text-xl mx-auto mb-5"
          style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>J+</div>

        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-semibold text-gray-700">Connecting to extension…</p>
          </>
        )}
        {status === "connected" && (
          <>
            {/* Hidden element for extension content script to read token */}
            <div
              data-jobtrack-token={tokenData?.token || ""}
              data-jobtrack-email={tokenData?.email || ""}
              style={{ display: "none" }}
            />
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connected!</h2>
            <p className="text-sm text-gray-500">Your extension is now linked. You can close this tab and start logging applications.</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">Could not link your account. Please try again.</p>
            <button onClick={() => window.location.reload()}
              className="px-5 py-2 text-white text-sm font-semibold rounded-lg"
              style={{ background: "linear-gradient(135deg,#6e7fc4,#5a6ab0)" }}>Retry</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return <Suspense><ConnectFlow /></Suspense>;
}
