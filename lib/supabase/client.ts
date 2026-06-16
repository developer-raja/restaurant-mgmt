import { createBrowserClient } from "@supabase/ssr";

// Fallbacks keep the UI rendering before you've added real keys.
// Auth/data calls will just fail gracefully until .env.local is filled.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(URL, KEY);
}

export const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
