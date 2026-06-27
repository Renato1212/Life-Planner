import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCalendarClient,
  createEvent,
  updateEvent,
  deleteEvent,
  pullEvents,
} from "./calendar";

// Orchestrates two-way sync for one user. Runs server-side with a
// service-role Supabase client (admin) so it can read the stored refresh token
// and write across the user's rows. Used by both the manual and cron routes.
export async function syncUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ pushed: number; pulled: number; resynced: boolean }> {
  const { data: tok } = await admin
    .from("user_google_tokens")
    .select("refresh_token, calendar_id, sync_token")
    .eq("user_id", userId)
    .single();

  if (!tok?.refresh_token) return { pushed: 0, pulled: 0, resynced: false };

  const cal = getCalendarClient(tok.refresh_token);
  const calendarId = tok.calendar_id || "primary";

  // Area slug lookup for event colors.
  const { data: areas } = await admin
    .from("areas")
    .select("id, slug")
    .eq("user_id", userId);
  const slugById = new Map((areas ?? []).map((a) => [a.id, a.slug]));

  // ── App → Google ────────────────────────────────────────────────
  const { data: tasks } = await admin
    .from("tasks")
    .select(
      "id, area_id, title, notes, status, scheduled_start, scheduled_end, google_event_id",
    )
    .eq("user_id", userId);

  let pushed = 0;
  for (const t of tasks ?? []) {
    const scheduled = Boolean(t.scheduled_start);
    const input = {
      title: t.title,
      notes: t.notes,
      scheduled_start: t.scheduled_start as string,
      scheduled_end: t.scheduled_end,
      areaSlug: slugById.get(t.area_id),
    };

    try {
      if (scheduled && t.status !== "done" && !t.google_event_id) {
        const id = await createEvent(cal, calendarId, input);
        await admin
          .from("tasks")
          .update({ google_event_id: id, last_synced_at: new Date().toISOString() })
          .eq("id", t.id);
        pushed++;
      } else if (t.google_event_id && (!scheduled || t.status === "done")) {
        await deleteEvent(cal, calendarId, t.google_event_id);
        await admin
          .from("tasks")
          .update({ google_event_id: null, last_synced_at: new Date().toISOString() })
          .eq("id", t.id);
        pushed++;
      } else if (scheduled && t.google_event_id && t.status !== "done") {
        await updateEvent(cal, calendarId, t.google_event_id, input);
        await admin
          .from("tasks")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", t.id);
        pushed++;
      }
    } catch {
      // Skip this task on transient failure; next sync retries.
    }
  }

  // ── Google → App ────────────────────────────────────────────────
  let { events, nextSyncToken, needFullResync } = await pullEvents(
    cal,
    calendarId,
    tok.sync_token,
  );
  let resynced = false;
  if (needFullResync) {
    resynced = true;
    ({ events, nextSyncToken } = await pullEvents(cal, calendarId, null));
  }

  let pulled = 0;
  for (const ev of events) {
    if (!ev.id) continue;
    const isOurs =
      ev.extendedProperties?.private?.quadrante === "1";
    if (ev.status === "cancelled") {
      await admin
        .from("google_events")
        .delete()
        .eq("user_id", userId)
        .eq("google_event_id", ev.id);
      continue;
    }
    await admin.from("google_events").upsert(
      {
        user_id: userId,
        google_event_id: ev.id,
        summary: ev.summary ?? "(no title)",
        start_at: ev.start?.dateTime ?? ev.start?.date ?? null,
        end_at: ev.end?.dateTime ?? ev.end?.date ?? null,
        status: ev.status ?? "confirmed",
        from_quadrante: isOurs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,google_event_id" },
    );
    pulled++;
  }

  if (nextSyncToken) {
    await admin
      .from("user_google_tokens")
      .update({ sync_token: nextSyncToken, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return { pushed, pulled, resynced };
}
