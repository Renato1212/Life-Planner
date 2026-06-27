"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
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
import { SUPABASE_ENABLED } from "./supabase/env";
import { getBrowserSupabase } from "./supabase/client";
import { fetchAll, seedIfEmpty, repo } from "./supabase/repository";

const STORAGE_KEY = "quadrante.db.v1";

// --------------------------------------------------------------------------
// Two persistence backends behind one identical React API:
//  • local    — localStorage (default; works with zero setup)
//  • supabase — Postgres via Supabase (active when env vars are present and
//               a user is signed in). Mutations optimistically update the
//               in-memory snapshot and write through to Supabase.
// The UI never changes between modes.
// --------------------------------------------------------------------------

const MODE: "local" | "supabase" = SUPABASE_ENABLED ? "supabase" : "local";

function loadLocal(): DB {
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

function persistLocal(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function emptyDB(): DB {
  return {
    version: 1,
    areas: [],
    goals: [],
    tasks: [],
    habits: [],
    habit_logs: [],
    area_scores: [],
    reviews: [],
  };
}

interface StoreApi {
  db: DB;
  ready: boolean;
  mode: "local" | "supabase";
  needsAuth: boolean;
  updateArea: (id: string, patch: Partial<Area>) => void;
  addGoal: (g: Omit<Goal, "id" | "created_at">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "created_at">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;
  addHabit: (h: Omit<Habit, "id" | "created_at">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (habitId: string, dateISO?: string) => void;
  saveReview: (r: Omit<Review, "id" | "created_at">) => void;
  snapshotScores: () => void;
  simulateHistory: () => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => (MODE === "local" ? buildSeed() : emptyDB()));
  const [ready, setReady] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const dbRef = useRef<DB>(db);
  dbRef.current = db;

  // ── Hydrate ──────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (MODE !== "supabase") return;
    const sb = getBrowserSupabase();
    const uidv = userIdRef.current;
    if (!sb || !uidv) return;
    const fresh = await fetchAll(sb, uidv);
    setDb(fresh);
  }, []);

  useEffect(() => {
    if (MODE === "local") {
      setDb(loadLocal());
      setReady(true);
      return;
    }
    // Supabase mode
    const sb = getBrowserSupabase();
    if (!sb) {
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!active) return;
      if (!user) {
        setNeedsAuth(true);
        setReady(true);
        return;
      }
      userIdRef.current = user.id;
      await seedIfEmpty(sb, user.id);
      const fresh = await fetchAll(sb, user.id);
      if (!active) return;
      setDb(fresh);
      setNeedsAuth(false);
      setReady(true);
    })();
    const { data: sub } = sb.auth.onAuthStateChange(
      (_e: unknown, session: { user?: { id?: string } } | null) => {
        userIdRef.current = session?.user?.id ?? null;
        if (!session?.user) setNeedsAuth(true);
      },
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Optimistic local commit (also persists in local mode).
  const commit = useCallback((next: DB) => {
    setDb(next);
    if (MODE === "local") persistLocal(next);
  }, []);

  // Fire-and-forget write-through for Supabase mode.
  const wt = useCallback(
    (
      fn: (
        sb: ReturnType<typeof getBrowserSupabase>,
        uid: string,
      ) => PromiseLike<unknown>,
    ) => {
      if (MODE !== "supabase") return;
      const sb = getBrowserSupabase();
      const uidv = userIdRef.current;
      if (!sb || !uidv) return;
      Promise.resolve(fn(sb, uidv)).catch((e) =>
        console.error("[quadrante sync]", e),
      );
    },
    [],
  );

  // ── Mutations ────────────────────────────────────────────────────
  const updateArea = useCallback(
    (id: string, patch: Partial<Area>) => {
      commit({
        ...dbRef.current,
        areas: dbRef.current.areas.map((a) =>
          a.id === id ? { ...a, ...patch } : a,
        ),
      });
      wt((sb, u) => repo.updateArea(sb!, u, id, patch));
    },
    [commit, wt],
  );

  const addGoal = useCallback(
    (g: Omit<Goal, "id" | "created_at">) => {
      if (MODE === "supabase") {
        wt(async (sb, u) => {
          await repo.addGoal(sb!, u, g);
          await reload();
        });
        return;
      }
      commit({
        ...dbRef.current,
        goals: [
          { ...g, id: uid("goal"), created_at: new Date().toISOString() },
          ...dbRef.current.goals,
        ],
      });
    },
    [commit, wt, reload],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Goal>) => {
      commit({
        ...dbRef.current,
        goals: dbRef.current.goals.map((g) =>
          g.id === id ? { ...g, ...patch } : g,
        ),
      });
      wt((sb, u) => repo.updateGoal(sb!, u, id, patch));
    },
    [commit, wt],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      commit({
        ...dbRef.current,
        goals: dbRef.current.goals.filter((g) => g.id !== id),
        tasks: dbRef.current.tasks.map((t) =>
          t.goal_id === id ? { ...t, goal_id: null } : t,
        ),
      });
      wt((sb, u) => repo.deleteGoal(sb!, u, id));
    },
    [commit, wt],
  );

  const addTask = useCallback(
    (t: Omit<Task, "id" | "created_at">) => {
      if (MODE === "supabase") {
        wt(async (sb, u) => {
          await repo.addTask(sb!, u, t);
          await reload();
        });
        return;
      }
      commit({
        ...dbRef.current,
        tasks: [
          { ...t, id: uid("task"), created_at: new Date().toISOString() },
          ...dbRef.current.tasks,
        ],
      });
    },
    [commit, wt, reload],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      commit({
        ...dbRef.current,
        tasks: dbRef.current.tasks.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      });
      wt((sb, u) => repo.updateTask(sb!, u, id, patch));
    },
    [commit, wt],
  );

  const deleteTask = useCallback(
    (id: string) => {
      commit({
        ...dbRef.current,
        tasks: dbRef.current.tasks.filter((t) => t.id !== id),
      });
      wt((sb, u) => repo.deleteTask(sb!, u, id));
    },
    [commit, wt],
  );

  const cycleTaskStatus = useCallback(
    (id: string) => {
      const order: Task["status"][] = ["todo", "doing", "done"];
      const cur = dbRef.current.tasks.find((t) => t.id === id);
      if (!cur) return;
      const next = order[(order.indexOf(cur.status) + 1) % order.length];
      commit({
        ...dbRef.current,
        tasks: dbRef.current.tasks.map((t) =>
          t.id === id ? { ...t, status: next } : t,
        ),
      });
      wt((sb, u) => repo.updateTask(sb!, u, id, { status: next }));
    },
    [commit, wt],
  );

  const addHabit = useCallback(
    (h: Omit<Habit, "id" | "created_at">) => {
      if (MODE === "supabase") {
        wt(async (sb, u) => {
          await repo.addHabit(sb!, u, h);
          await reload();
        });
        return;
      }
      commit({
        ...dbRef.current,
        habits: [
          { ...h, id: uid("habit"), created_at: new Date().toISOString() },
          ...dbRef.current.habits,
        ],
      });
    },
    [commit, wt, reload],
  );

  const updateHabit = useCallback(
    (id: string, patch: Partial<Habit>) => {
      commit({
        ...dbRef.current,
        habits: dbRef.current.habits.map((h) =>
          h.id === id ? { ...h, ...patch } : h,
        ),
      });
      wt((sb, u) => repo.updateHabit(sb!, u, id, patch));
    },
    [commit, wt],
  );

  const deleteHabit = useCallback(
    (id: string) => {
      commit({
        ...dbRef.current,
        habits: dbRef.current.habits.filter((h) => h.id !== id),
        habit_logs: dbRef.current.habit_logs.filter((l) => l.habit_id !== id),
      });
      wt((sb, u) => repo.deleteHabit(sb!, u, id));
    },
    [commit, wt],
  );

  const toggleHabit = useCallback(
    (habitId: string, dateISO = todayISO()) => {
      const existing = dbRef.current.habit_logs.find(
        (l) => l.habit_id === habitId && l.log_date === dateISO,
      );
      const nextCompleted = existing ? !existing.completed : true;
      if (existing) {
        commit({
          ...dbRef.current,
          habit_logs: dbRef.current.habit_logs.map((l) =>
            l.id === existing.id ? { ...l, completed: nextCompleted } : l,
          ),
        });
      } else {
        commit({
          ...dbRef.current,
          habit_logs: [
            ...dbRef.current.habit_logs,
            {
              id: uid("log"),
              habit_id: habitId,
              log_date: dateISO,
              completed: true,
            },
          ],
        });
      }
      wt((sb, u) =>
        repo.setHabitLog(sb!, u, habitId, dateISO, nextCompleted),
      );
    },
    [commit, wt],
  );

  const saveReview = useCallback(
    (r: Omit<Review, "id" | "created_at">) => {
      const week = r.week_start;
      const others = dbRef.current.reviews.filter((x) => x.week_start !== week);
      commit({
        ...dbRef.current,
        reviews: [
          ...others,
          { ...r, id: uid("review"), created_at: new Date().toISOString() },
        ],
      });
      wt((sb, u) => repo.upsertReview(sb!, u, r));
    },
    [commit, wt],
  );

  const snapshotScores = useCallback(() => {
    const week = weekStartISO();
    const base = dbRef.current;
    const rows = base.areas.map((a) => ({
      area_id: a.id,
      week_start: week,
      score: computeAreaScore(base, a.id),
    }));
    const fresh: AreaScore[] = rows.map((r) => ({ ...r, id: uid("score") }));
    const others = base.area_scores.filter((s) => s.week_start !== week);
    commit({ ...base, area_scores: [...others, ...fresh] });
    wt((sb, u) => repo.upsertAreaScores(sb!, u, rows));
  }, [commit, wt]);

  // Demo helpers are local-only (they fabricate historical data).
  const simulateHistory = useCallback(() => {
    const today = new Date();
    const base = dbRef.current;
    const logs = [...base.habit_logs];
    const seen = new Set(logs.map((l) => `${l.habit_id}:${l.log_date}`));
    for (let i = 0; i < 35; i++) {
      const d = isoDate(addDays(today, -i));
      for (const h of base.habits) {
        if (!h.active) continue;
        const key = `${h.id}:${d}`;
        if (seen.has(key)) continue;
        if (Math.random() < 0.78) {
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
    const scores: AreaScore[] = [];
    const start: Record<string, number> = {};
    for (const a of base.areas) start[a.id] = 35 + Math.floor(Math.random() * 20);
    for (let w = 5; w >= 1; w--) {
      const weekStart = weekStartISO(addDays(today, -7 * w));
      for (const a of base.areas) {
        const drift = (6 - w) * (4 + Math.floor(Math.random() * 5));
        scores.push({
          id: uid("score"),
          area_id: a.id,
          week_start: weekStart,
          score: Math.min(95, start[a.id] + drift),
        });
      }
    }
    commit({ ...base, habit_logs: logs, area_scores: [...scores, ...base.area_scores] });
  }, [commit]);

  const resetDemo = useCallback(() => {
    if (MODE === "supabase") {
      void reload();
      return;
    }
    commit(buildSeed());
  }, [commit, reload]);

  const value = useMemo<StoreApi>(
    () => ({
      db,
      ready,
      mode: MODE,
      needsAuth,
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
      needsAuth,
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

export function useArea(slug: string): Area | undefined {
  const { db } = useStore();
  return db.areas.find((a) => a.slug === slug);
}

export { isoDate };
