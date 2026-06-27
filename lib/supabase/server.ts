import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from "./env";

// Server Supabase client bound to the request cookies (RLS as the signed-in
// user). Returns null when the backend isn't configured.
export function getServerSupabase() {
  if (!SUPABASE_ENABLED) return null;
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component — safe to ignore, middleware
          // refreshes the session.
        }
      },
    },
  });
}

// Service-role client — SERVER ONLY, bypasses RLS. Use for trusted backend
// jobs (cron sync) and for reading stored Google refresh tokens.
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!SUPABASE_URL || !key) return null;
  return createServerClient(SUPABASE_URL, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
