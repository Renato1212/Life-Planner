// Single source of truth for "is the Supabase backend configured?".
// When env vars are absent the app runs entirely on the local-storage store,
// so the experience never breaks before credentials are added.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Public flag usable on the client (Next inlines NEXT_PUBLIC_* at build time).
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
