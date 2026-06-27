import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DB,
  Goal,
  Task,
  Habit,
  Review,
  Area,
  RoutineBlock,
} from "@/lib/types";
import { buildSeed } from "@/lib/seed";

// Maps the store's operations onto Supabase tables. Every row carries user_id;
// RLS guarantees a user only ever touches their own rows. Column names match
// lib/types.ts so mapping is a pass-through (plus user_id on writes).

const TABLES = [
  "areas",
  "goals",
  "tasks",
  "habits",
  "habit_logs",
  "area_scores",
  "reviews",
  "routine_blocks",
] as const;

export async function fetchAll(
  sb: SupabaseClient,
  userId: string,
): Promise<DB> {
  const [
    areas,
    goals,
    tasks,
    habits,
    habit_logs,
    area_scores,
    reviews,
    routine_blocks,
  ] = await Promise.all(
    TABLES.map((t) =>
      sb.from(t).select("*").eq("user_id", userId).then((r) => r.data ?? []),
    ),
  );
  return {
    version: 2,
    areas: areas as Area[],
    goals: goals as Goal[],
    tasks: tasks as Task[],
    habits: habits as Habit[],
    habit_logs: habit_logs as DB["habit_logs"],
    area_scores: area_scores as DB["area_scores"],
    reviews: reviews as Review[],
    routine_blocks: routine_blocks as RoutineBlock[],
  };
}

// Idempotent first-login seed: only seeds when the user has no areas yet.
export async function seedIfEmpty(
  sb: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count } = await sb
    .from("areas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (count && count > 0) return false;

  const seed = buildSeed();
  const withUser = <T extends object>(rows: T[]) =>
    rows.map((r) => ({ ...r, user_id: userId }));

  // Insert in FK order. The seed uses string ids; Supabase columns are uuid,
  // so we let Postgres generate ids and remap relations.
  const areaMap = new Map<string, string>();
  for (const a of seed.areas) {
    const { data } = await sb
      .from("areas")
      .insert({
        user_id: userId,
        name: a.name,
        slug: a.slug,
        color: a.color,
        icon: a.icon,
        sort_order: a.sort_order,
      })
      .select("id")
      .single();
    if (data) areaMap.set(a.id, data.id);
  }

  const goalMap = new Map<string, string>();
  for (const g of seed.goals) {
    const { data } = await sb
      .from("goals")
      .insert({
        user_id: userId,
        area_id: areaMap.get(g.area_id),
        title: g.title,
        description: g.description ?? null,
        status: g.status,
        progress: g.progress,
        target_date: g.target_date ?? null,
      })
      .select("id")
      .single();
    if (data) goalMap.set(g.id, data.id);
  }

  if (seed.tasks.length) {
    await sb.from("tasks").insert(
      seed.tasks.map((t) => ({
        user_id: userId,
        area_id: areaMap.get(t.area_id),
        goal_id: t.goal_id ? goalMap.get(t.goal_id) : null,
        title: t.title,
        notes: t.notes ?? null,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? null,
      })),
    );
  }

  if (seed.habits.length) {
    await sb.from("habits").insert(
      seed.habits.map((h) => ({
        user_id: userId,
        area_id: areaMap.get(h.area_id),
        title: h.title,
        cadence: h.cadence,
        target_time: h.target_time ?? null,
        rrule: h.rrule ?? null,
        active: h.active,
      })),
    );
  }

  return true;
}

// ── Granular write-through helpers (used by the store in Supabase mode) ──
const u = (userId: string) => ({ user_id: userId });

export const repo = {
  updateArea: (sb: SupabaseClient, _u: string, id: string, p: Partial<Area>) =>
    sb.from("areas").update(p).eq("id", id),

  addGoal: (sb: SupabaseClient, uid: string, g: Partial<Goal>) =>
    sb.from("goals").insert({ ...g, ...u(uid) }),
  updateGoal: (sb: SupabaseClient, _u: string, id: string, p: Partial<Goal>) =>
    sb.from("goals").update(p).eq("id", id),
  deleteGoal: (sb: SupabaseClient, _u: string, id: string) =>
    sb.from("goals").delete().eq("id", id),

  addTask: (sb: SupabaseClient, uid: string, t: Partial<Task>) =>
    sb.from("tasks").insert({ ...t, ...u(uid) }),
  updateTask: (sb: SupabaseClient, _u: string, id: string, p: Partial<Task>) =>
    sb.from("tasks").update(p).eq("id", id),
  deleteTask: (sb: SupabaseClient, _u: string, id: string) =>
    sb.from("tasks").delete().eq("id", id),

  addHabit: (sb: SupabaseClient, uid: string, h: Partial<Habit>) =>
    sb.from("habits").insert({ ...h, ...u(uid) }),
  updateHabit: (sb: SupabaseClient, _u: string, id: string, p: Partial<Habit>) =>
    sb.from("habits").update(p).eq("id", id),
  deleteHabit: (sb: SupabaseClient, _u: string, id: string) =>
    sb.from("habits").delete().eq("id", id),

  setHabitLog: (
    sb: SupabaseClient,
    uid: string,
    habitId: string,
    logDate: string,
    completed: boolean,
  ) =>
    sb
      .from("habit_logs")
      .upsert(
        { user_id: uid, habit_id: habitId, log_date: logDate, completed },
        { onConflict: "habit_id,log_date" },
      ),

  upsertReview: (sb: SupabaseClient, uid: string, r: Partial<Review>) =>
    sb
      .from("reviews")
      .upsert({ ...r, ...u(uid) }, { onConflict: "user_id,week_start" }),

  upsertAreaScores: (
    sb: SupabaseClient,
    uid: string,
    rows: { area_id: string; week_start: string; score: number }[],
  ) =>
    sb
      .from("area_scores")
      .upsert(
        rows.map((r) => ({ ...r, user_id: uid })),
        { onConflict: "area_id,week_start" },
      ),

  addRoutineBlock: (
    sb: SupabaseClient,
    uid: string,
    b: Partial<RoutineBlock>,
  ) => sb.from("routine_blocks").insert({ ...b, ...u(uid) }),
  updateRoutineBlock: (
    sb: SupabaseClient,
    _u: string,
    id: string,
    p: Partial<RoutineBlock>,
  ) => sb.from("routine_blocks").update(p).eq("id", id),
  deleteRoutineBlock: (sb: SupabaseClient, _u: string, id: string) =>
    sb.from("routine_blocks").delete().eq("id", id),
};
