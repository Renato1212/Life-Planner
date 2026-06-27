# CLAUDE.md — Quadrante (Personal Life OS)

Source of truth for the project. Keep this updated as the app evolves.

## What this is

A single-user personal life-management app organized around **four life areas**:
**Spiritual · Wealth · Health · Relationship**. You plan (goals), act (tasks),
build consistency (habits), and **see improvement over time** (scores, Life
Wheel, trends, weekly review). A Schedule view shows time-blocked tasks and is
designed to sync two-way with Google Calendar.

The four areas are seeded but **fully editable** (name / color / icon).

## Stack

- **Next.js 14 (App Router) + TypeScript** — `app/` directory.
- **Tailwind CSS** with an iOS-inspired design system (`app/globals.css`,
  `tailwind.config.ts`). No component library dependency — primitives are
  hand-rolled in `components/ui.tsx` for full control of the iOS feel.
- **Recharts** — Life Wheel (radar) + Trends (line).
- **lucide-react** — icons (mapped in `components/Icon.tsx`).
- **date-fns** — date math (`lib/date.ts`).
- **pnpm** package manager. Versions pinned in `package.json`.

## Data layer — important

The app currently persists to **`localStorage`** through a single typed store
(`lib/store.tsx`). This makes it instantly usable and installable as a PWA with
zero backend setup.

`lib/types.ts` mirrors the planned **Supabase schema 1:1**
(`supabase/migrations/0001_init.sql`). To move to Supabase:

1. Run the migration; it enables RLS on every table (owner = `auth.uid()`).
2. Replace the body of `lib/store.tsx` with Supabase queries — the React API
   surface (`useStore()` and its methods) stays identical, so **no UI changes**.
3. Add Google OAuth + Calendar sync (see "Planned backend" below).

Do not change `lib/types.ts` field names without updating both the migration
and the store.

## Folder structure

```
app/
  layout.tsx            root shell: providers + bottom TabBar + theme bootstrap
  globals.css           iOS design tokens (light/dark), animations, primitives
  page.tsx              Dashboard — Life Wheel + 2×2 area cards
  today/page.tsx        Today — habits + tasks across all areas
  schedule/page.tsx     Schedule — week/day agenda of scheduled tasks
  review/page.tsx       Weekly Review — scores, trends, reflections, focus
  area/[slug]/page.tsx  Area detail — goals / tasks (kanban) / habits + FAB
components/
  ui.tsx                Card, Button, Sheet, Segmented, Field, Ring,
                        ProgressBar, Toast
  Icon.tsx              lucide icon name → component map
  TabBar.tsx            iOS bottom tab navigation
  PageHeader.tsx        large-title header + theme toggle
  ThemeToggle.tsx       light/dark with persisted preference
  LifeWheel.tsx         radar chart (hero visual)
  TrendsChart.tsx       multi-line area-score trend chart
  rows.tsx              TaskRow / HabitRow / GoalRow
  editors.tsx           GoalEditor / TaskEditor / HabitEditor (bottom sheets)
lib/
  types.ts              domain types (== Supabase schema)
  store.tsx             StoreProvider + useStore() (localStorage-backed)
  seed.ts               idempotent seed of the four areas + starting data
  scoring.ts            streaks, weekly completion, per-area 0–100 score
  date.ts               week/day helpers (week starts Monday)
  utils.ts              cn(), uid(), haptic()
supabase/migrations/    Postgres schema + RLS (for the Supabase swap)
scripts/gen-icons.mjs   dependency-free PWA icon generator
public/                 manifest.webmanifest + generated icons
```

## Scoring model (`lib/scoring.ts`)

Per-area weekly score (0–100) = mean of whichever of these exist for the area:
- **habit completion rate** this week,
- **average goal progress** (done = 100),
- **task throughput** (share of tasks done).

Snapshotted into `area_scores` weekly. The Life Wheel reads live scores; Trends
read the historical snapshots.

## Conventions

- iOS feel: large titles, frosted glass nav, rounded cards (`rounded-ios`),
  generous whitespace, spring `cubic-bezier(0.32,0.72,0,1)` motion, `active-press`
  on tappables, light haptics, safe-area insets, bottom-sheet modals.
- One clear primary action per surface (FAB on area pages).
- Mobile-first; `max-w-2xl` keeps it centered and comfortable on desktop too.
- Calm palette, no neon. Area colors: Spiritual `#8B7FD6`, Wealth `#3E9B7A`,
  Health `#E08A5B`, Relationship `#D97291`.

## Planned backend (not yet wired)

- **Auth:** Supabase Auth, Google only. Scopes: `openid email profile` +
  `https://www.googleapis.com/auth/calendar.events`. Pass
  `access_type=offline&prompt=consent` to get a refresh token. Capture
  `provider_refresh_token` on callback and store in `user_google_tokens`.
- **Calendar App→Google:** on `scheduled_start/end`, create event, store
  `google_event_id` + `last_synced_at`; edits/completes update/delete.
- **Calendar Google→App:** incremental sync via `events.list` + `syncToken`;
  full re-sync on 410. Manual "Sync now" + Vercel Cron (~15 min).
- **Tokens:** server-side only; mint access tokens from the stored refresh
  token per request. Last-write-wins; skip echo updates via `last_synced_at`.

## TODO (later, do not build yet)

- `events.watch` push notifications for real-time Calendar sync.
- PT-PT locale via `next-intl` (UI strings are English now; keep them
  centralizable when i18n is added).
- Service worker for full offline PWA caching.

## Working agreement

- Keep `lib/types.ts` ↔ migration ↔ store in lockstep.
- Never put secrets in client code or commits — `.env.local` only.
- Don't add unrequested features; note ideas as TODO and keep moving.
