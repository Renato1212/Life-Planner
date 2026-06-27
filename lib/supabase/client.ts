"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from "./env";

// Browser-side Supabase client (singleton). Returns null when the backend
// isn't configured so callers can fall back to the local store.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!SUPABASE_ENABLED) return null;
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}
