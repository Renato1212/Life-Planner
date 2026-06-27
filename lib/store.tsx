"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  DB,
  Area,
  Goal,
  Task,
  Habit,
  AreaScore,
  Review,
} from "./types";
import { buildSeed } from "./seed";
import { uid } from "./utils";
import { isoDate, weekStartISO, todayISO, addDays } from "./date";
import { computeAreaScore } from "./scoring";

const STORAGE_KEY = "quadrante.db.v1";

// --------------------------------------------------------------------------
// Persistence layer. Swap this module for a Supabase-backed implementation
// later — the React API surface below stays identical.
// --------------------------------------------------------------------------

function load(): DB {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as DB;
  } catch {
    return buildSeed();
  }
}

function persist(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

interface StoreApi {
  db: DB;
  ready: boolean;
  // areas
  updateArea: (id: string, patch: Partial<Area>) => void;
  // goals
  addGoal: (g: Omit<Goal, "id" | "created_at">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  // tasks
  addTask: (t: Omit<Task, "id" | "created_at">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;
  // habits
  addHabit: (h: Omit<Habit, "id" | "created_at">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (habitId: string, dateISO?: string) => void;
  // review + scoring
  saveReview: (r: Omit<Review, "id" | "created_at">) => void;
  snapshotScores: () => void;
  simulateHistory: () => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => buildSeed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDb(load());
    setReady(true);
  }, []);

  const commit = useCallback((next: DB) => {
    setDb(next);
    persist(next);
  }, []);

  const updateArea = useCallback(
    (id: string, patch: Partial<Area>) =>
      commit({
        ...db,
        areas: db.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }),
    [db, commit],
  );

  const addGoal = useCallback(
    (g: Omit<Goal, "id" | "created_at">) =>
      commit({
        ...db,
        goals: [
          { ...g, id: uid("goal"), created_at: new Date().toISOString() },
          ...db.goals,
        ],
      }),
    [db, commit],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Goal>) =>
      commit({
        ...db,
        goals: db.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }),
    [db, commit],
  );

  const deleteGoal = useCallback(
    (id: string) =>
      commit({
        ...db,
        goals: db.goals.filter((g) => g.id !== id),
        tasks: db.tasks.map((t) =>
          t.goal_id === id ? { ...t, goal_id: null } : t,
        ),
      }),
    [db, commit],
  );

  const addTask = useCallback(
    (t: Omit<Task, "id" | "created_at">) =>
      commit({
        ...db,
        tasks: [
          { ...t, id: uid("task"), created_at: new Date().toISOString() },
          ...db.tasks,
        ],
      }),
    [db, commit],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      commit({
        ...db,
        tasks: db.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }),
    [db, commit],
  );

  const deleteTask = useCallback(
    (id: string) =>
      commit({ ...db, tasks: db.tasks.filter((t) => t.id !== id) }),
    [db, commit],
  );

  const cycleTaskStatus = useCallback(
    (id: string) => {
      const order: Task["status"][] = ["todo", "doing", "done"];
      commit({
        ...db,
        tasks: db.tasks.map((t) => {
          if (t.id !== id) return t;
          const next = order[(order.indexOf(t.status) + 1) % order.length];
          return { ...t, status: next };
        }),
      });
    },
    [db, commit],
  );

  const addHabit = useCallback(
    (h: Omit<Habit, "id" | "created_at">) =>
      commit({
        ...db,
        habits: [
          { ...h, id: uid("habit"), created_at: new Date().toISOString() },
          ...db.habits,
        ],
      }),
    [db, commit],
  );

  const updateHabit = useCallback(
    (id: string, patch: Partial<Habit>) =>
      commit({
        ...db,
        habits: db.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      }),
    [db, commit],
  );

  const deleteHabit = useCallback(
    (id: string) =>
      commit({
        ...db,
        habits: db.habits.filter((h) => h.id !== id),
        habit_logs: db.habit_logs.filter((l) => l.habit_id !== id),
      }),
    [db, commit],
  );

  const toggleHabit = useCallback(
    (habitId: string, dateISO = todayISO()) => {
      const existing = db.habit_logs.find(
        (l) => l.habit_id === habitId && l.log_date === dateISO,
      );
      if (existing) {
        commit({
          ...db,
          habit_logs: db.habit_logs.map((l) =>
            l.id === existing.id ? { ...l, completed: !l.completed } : l,
          ),
        });
      } else {
        commit({
          ...db,
          habit_logs: [
            ...db.habit_logs,
            {
              id: uid("log"),
              habit_id: habitId,
              log_date: dateISO,
              completed: true,
            },
          ],
        });
      }
    },
    [db, commit],
  );

  const saveReview = useCallback(
    (r: Omit<Review, "id" | "created_at">) => {
      const week = r.week_start;
      const others = db.reviews.filter((x) => x.week_start !== week);
      commit({
        ...db,
        reviews: [
          ...others,
          { ...r, id: uid("review"), created_at: new Date().toISOString() },
        ],
      });
    },
    [db, commit],
  );

  const snapshotScores = useCallback(() => {
    const week = weekStartISO();
    const fresh: AreaScore[] = db.areas.map((a) => ({
      id: uid("score"),
      area_id: a.id,
      week_start: week,
      score: computeAreaScore(db, a.id),
    }));
    const others = db.area_scores.filter((s) => s.week_start !== week);
    commit({ ...db, area_scores: [...others, ...fresh] });
  }, [db, commit]);

  // Backfill ~5 weeks of habit logs + weekly score snapshots so the streaks,
  // Life Wheel, and Trends visibly populate during the Review walkthrough.
  const simulateHistory = useCallback(() => {
    const today = new Date();
    const logs = [...db.habit_logs];
    const seen = new Set(
      logs.map((l) => `${l.habit_id}:${l.log_date}`),
    );
    // 35 days of habit logs with a realistic ~78% completion rate.
    for (let i = 0; i < 35; i++) {
      const d = isoDate(addDays(today, -i));
      for (const h of db.habits) {
        if (!h.active) continue;
        const key = `${h.id}:${d}`;
        if (seen.has(key)) continue;
        const completed = Math.random() < 0.78;
        if (completed) {
          logs.push({
            id: uid("log"),
            habit_id: h.id,
            log_date: d,
            completed: true,
          });
          seen.add(key);
        }
      }
    }

    // Weekly area-score snapshots trending gently upward.
    const scores: AreaScore[] = [];
    const base: Record<string, number> = {};
    for (const a of db.areas) base[a.id] = 35 + Math.floor(Math.random() * 20);
    for (let w = 5; w >= 1; w--) {
      const weekStart = weekStartISO(addDays(today, -7 * w));
      for (const a of db.areas) {
        const drift = (6 - w) * (4 + Math.floor(Math.random() * 5));
        const score = Math.min(95, base[a.id] + drift);
        scores.push({
          id: uid("score"),
          area_id: a.id,
          week_start: weekStart,
          score,
        });
      }
    }

    commit({ ...db, habit_logs: logs, area_scores: [...scores, ...db.area_scores] });
  }, [db, commit]);

  const resetDemo = useCallback(() => {
    const seed = buildSeed();
    commit(seed);
  }, [commit]);

  const value = useMemo<StoreApi>(
    () => ({
      db,
      ready,
      updateArea,
      addGoal,
      updateGoal,
      deleteGoal,
      addTask,
      updateTask,
      deleteTask,
      cycleTaskStatus,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      saveReview,
      snapshotScores,
      simulateHistory,
      resetDemo,
    }),
    [
      db,
      ready,
      updateArea,
      addGoal,
      updateGoal,
      deleteGoal,
      addTask,
      updateTask,
      deleteTask,
      cycleTaskStatus,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      saveReview,
      snapshotScores,
      simulateHistory,
      resetDemo,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Convenience selectors -----------------------------------------------------

export function useArea(slug: string): Area | undefined {
  const { db } = useStore();
  return db.areas.find((a) => a.slug === slug);
}

export { isoDate };
