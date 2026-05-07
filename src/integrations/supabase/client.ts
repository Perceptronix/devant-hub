import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://skawjzbmoyovbrhbquts.supabase.co";

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrYXdqemJtb3lvdmJyaGJxdXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjkxNTksImV4cCI6MjA5Mzc0NTE1OX0.zZPOBhpQqD_a7smkHF-POdCSGMH95eTGWfiPXM89QQ8";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
  return _client;
}

export const supabase = typeof window !== "undefined" ? getSupabase() : (null as unknown as SupabaseClient);
