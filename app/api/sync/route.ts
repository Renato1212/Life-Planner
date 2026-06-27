import { NextResponse } from "next/server";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import { syncUser } from "@/lib/google/sync";

export const dynamic = "force-dynamic";

// Manual "Sync now" for the signed-in user.
export async function POST() {
  const supabase = getServerSupabase();
  const admin = getAdminSupabase();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "backend-disabled" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncUser(admin, user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: "sync-failed", detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
