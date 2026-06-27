import { NextResponse } from "next/server";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";

// OAuth callback: exchanges the code for a session and — critically — captures
// the Google provider_refresh_token ONCE and stores it server-side. Supabase
// does not persist provider tokens for us, so every later Calendar call mints a
// fresh access token from this stored refresh token.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = getServerSupabase();
  if (!supabase || !code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=exchange`);
  }

  // Persist the refresh token (only present on the first consent).
  const refresh = data.session?.provider_refresh_token;
  const userId = data.session?.user?.id;
  if (refresh && userId) {
    const admin = getAdminSupabase();
    if (admin) {
      await admin.from("user_google_tokens").upsert(
        {
          user_id: userId,
          refresh_token: refresh,
          calendar_id: "primary",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
