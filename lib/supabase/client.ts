import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Handle build-time missing variables gracefully
  if (!url || !key) {
    return {} as any; 
  }

  return createBrowserClient(url, key);
}
