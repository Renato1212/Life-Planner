import type { DB, Habit, HabitLog } from "./types";
import { isoDate, weekStartISO, addDays, parseISO } from "./date";

// Habit streak + completion helpers --------------------------------------

export function habitLogsFor(db: DB, habitId: string): HabitLog[] {
  return db.habit_logs.filter((l) => l.habit_id === habitId);
}

export function isHabitDoneOn(db: DB, habitId: string, dateISO: string): boolean {
  return db.habit_logs.some(
    (l) => l.habit_id === habitId && l.log_date === dateISO && l.completed,
  );
}

export function currentStreak(db: DB, habitId: string): number {
  let streak = 0;
  let cursor = new Date();
  // Allow today to be incomplete without breaking the streak.
  if (!isHabitDoneOn(db, habitId, isoDate(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (isHabitDoneOn(db, habitId, isoDate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(db: DB, habitId: string): number {
  const dates = db.habit_logs
    .filter((l) => l.habit_id === habitId && l.completed)
    .map((l) => l.log_date)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of dates) {
    const cur = parseISO(d);
    if (prev && isoDate(addDays(prev, 1)) === d) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

export function weeklyCompletion(db: DB, habit: Habit): number {
  const start = parseISO(weekStartISO());
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = isoDate(addDays(start, i));
    if (isHabitDoneOn(db, habit.id, d)) done += 1;
  }
  return Math.round((done / 7) * 100);
}

// Area scoring -----------------------------------------------------------
// Score = blend of habit completion rate + avg goal progress + task throughput.

export function computeAreaScore(db: DB, areaId: string): number {
  const habits = db.habits.filter((h) => h.area_id === areaId && h.active);
  const goals = db.goals.filter(
    (g) => g.area_id === areaId && g.status !== "paused",
  );
  const tasks = db.tasks.filter((t) => t.area_id === areaId);

  // Habit completion rate (this week)
  let habitScore = 0;
  if (habits.length) {
    const avg =
      habits.reduce((s, h) => s + weeklyCompletion(db, h), 0) / habits.length;
    habitScore = avg;
  }

  // Average goal progress
  let goalScore = 0;
  if (goals.length) {
    goalScore =
      goals.reduce(
        (s, g) => s + (g.status === "done" ? 100 : g.progress),
        0,
      ) / goals.length;
  }

  // Task throughput (share of tasks done)
  let taskScore = 0;
  if (tasks.length) {
    const done = tasks.filter((t) => t.status === "done").length;
    taskScore = (done / tasks.length) * 100;
  }

  // Weighted blend. Only count dimensions that exist so empty areas don't
  // get unfairly punished.
  const parts: number[] = [];
  if (habits.length) parts.push(habitScore);
  if (goals.length) parts.push(goalScore);
  if (tasks.length) parts.push(taskScore);
  if (!parts.length) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function liveScores(db: DB): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of db.areas) out[a.id] = computeAreaScore(db, a.id);
  return out;
}
