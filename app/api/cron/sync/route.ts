import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { syncUser } from "@/lib/google/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled sync (Vercel Cron, see vercel.json). Guarded by CRON_SECRET:
// Vercel sends `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "backend-disabled" }, { status: 503 });
  }

  // Sync every user that has connected Google.
  const { data: tokens } = await admin
    .from("user_google_tokens")
    .select("user_id");

  let users = 0;
  for (const row of tokens ?? []) {
    try {
      await syncUser(admin, row.user_id);
      users++;
    } catch {
      // continue with the next user
    }
  }

  return NextResponse.json({ ok: true, users });
}
