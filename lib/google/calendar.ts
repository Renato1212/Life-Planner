import { google, type calendar_v3 } from "googleapis";

// Server-side Google Calendar helpers. Tokens never reach the client: we build
// an OAuth2 client from the user's stored refresh token, and googleapis mints a
// fresh access token (against https://oauth2.googleapis.com/token) per request.

export function getCalendarClient(refreshToken: string): calendar_v3.Calendar {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2 });
}

// Calm per-area event colors (Google colorId palette).
const AREA_COLOR_ID: Record<string, string> = {
  spiritual: "1", // lavender
  wealth: "10", // basil/green
  health: "6", // tangerine
  relationship: "4", // flamingo/pink
};

export interface TaskEventInput {
  title: string;
  notes?: string | null;
  scheduled_start: string; // ISO
  scheduled_end?: string | null;
  areaSlug?: string;
}

function toEvent(t: TaskEventInput): calendar_v3.Schema$Event {
  const start = new Date(t.scheduled_start);
  const end = t.scheduled_end
    ? new Date(t.scheduled_end)
    : new Date(start.getTime() + 30 * 60 * 1000);
  return {
    summary: t.title,
    description: [t.notes, "— via Quadrante"].filter(Boolean).join("\n"),
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    colorId: t.areaSlug ? AREA_COLOR_ID[t.areaSlug] : undefined,
    extendedProperties: { private: { quadrante: "1" } },
  };
}

export async function createEvent(
  cal: calendar_v3.Calendar,
  calendarId: string,
  t: TaskEventInput,
): Promise<string | undefined> {
  const res = await cal.events.insert({
    calendarId,
    requestBody: toEvent(t),
  });
  return res.data.id ?? undefined;
}

export async function updateEvent(
  cal: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  t: TaskEventInput,
): Promise<void> {
  await cal.events.update({
    calendarId,
    eventId,
    requestBody: toEvent(t),
  });
}

export async function deleteEvent(
  cal: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await cal.events.delete({ calendarId, eventId });
  } catch (e: any) {
    // 404/410 — already gone; treat as success.
    if (e?.code !== 404 && e?.code !== 410) throw e;
  }
}

export interface PullResult {
  events: calendar_v3.Schema$Event[];
  nextSyncToken?: string | null;
  needFullResync: boolean;
}

// Incremental sync. First run (no syncToken) is a full sync; afterwards we pass
// the stored syncToken. A 410 means the token expired → caller does a full
// re-sync by clearing the stored token.
export async function pullEvents(
  cal: calendar_v3.Calendar,
  calendarId: string,
  syncToken?: string | null,
): Promise<PullResult> {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null | undefined;

  try {
    do {
      const res = await cal.events.list({
        calendarId,
        singleEvents: true,
        showDeleted: true,
        maxResults: 250,
        pageToken,
        ...(syncToken
          ? { syncToken }
          : { timeMin: new Date(Date.now() - 30 * 864e5).toISOString() }),
      });
      events.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
      nextSyncToken = res.data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
  } catch (e: any) {
    if (e?.code === 410) {
      return { events: [], nextSyncToken: null, needFullResync: true };
    }
    throw e;
  }

  return { events, nextSyncToken, needFullResync: false };
}
