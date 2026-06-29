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
  RoutineBlock,
} from "./types";
import { buildSeed, defaultDayBlocks } from "./seed";
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

// Forward-migrate an older saved DB: drop the removed Spiritual area, and
// backfill new fields (routine_blocks, task.subtasks) so existing users get
// the new features without losing their data.
function migrate(db: DB): DB {
  let changed = false;
  const next: DB = { ...db };

  const spiritual = next.areas.find((a) => a.slug === "spiritual");
  if (spiritual) {
    next.areas = next.areas.filter((a) => a.id !== spiritual.id);
    next.goals = next.goals.filter((g) => g.area_id !== spiritual.id);
    next.tasks = next.tasks.filter((t) => t.area_id !== spiritual.id);
    next.habits = next.habits.filter((h) => h.area_id !== spiritual.id);
    next.area_scores = next.area_scores.filter(
      (s) => s.area_id !== spiritual.id,
    );
    changed = true;
  }
  if (!Array.isArray(next.routine_blocks)) {
    next.routine_blocks = [];
    changed = true;
  }
  next.tasks = next.tasks.map((t) =>
    t.subtasks ? t : { ...t, subtasks: [] },
  );

  if (changed || next.version < 2) next.version = 2;
  return next;
}

function loadLocal(): DB {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const migrated = migrate(JSON.parse(raw) as DB);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return buildSeed();
  }
}

// Returns false if the write failed (e.g. Safari Private Mode, blocked storage,
// or quota) so the UI can warn instead of silently losing data.
function persistLocal(db: DB): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}

function storageWorks(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const k = "__quadrante_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function emptyDB(): DB {
  return {
    version: 2,
    areas: [],
    goals: [],
    tasks: [],
    habits: [],
    habit_logs: [],
    area_scores: [],
    reviews: [],
    routine_blocks: [],
  };
}

interface StoreApi {
  db: DB;
  ready: boolean;
  mode: "local" | "supabase";
  needsAuth: boolean;
  storageOk: boolean;
  updateArea: (id: string, patch: Partial<Area>) => void;
  addGoal: (g: Omit<Goal, "id" | "created_at">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "created_at">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addHabit: (h: Omit<Habit, "id" | "created_at">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (habitId: string, dateISO?: string) => void;
  saveReview: (r: Omit<Review, "id" | "created_at">) => void;
  snapshotScores: () => void;
  simulateHistory: () => void;
  resetDemo: () => void;
  // Daily Blueprint (routine)
  addRoutineBlock: (b: Omit<RoutineBlock, "id" | "created_at">) => void;
  updateRoutineBlock: (id: string, patch: Partial<RoutineBlock>) => void;
  deleteRoutineBlock: (id: string) => void;
  applyDefaultDay: () => void;
  restoreStarterHabits: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => (MODE === "local" ? buildSeed() : emptyDB()));
  const [ready, setReady] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
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
      setStorageOk(storageWorks());
      setReady(true);
      // Keep multiple open tabs in sync and prevent a stale tab from
      // overwriting newer data: when another tab writes, re-read it here.
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            setDb(migrate(JSON.parse(e.newValue) as DB));
          } catch {
            /* ignore malformed */
          }
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
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
    // React to sign-in/out that happen in-app (e.g. email+password), which
    // don't reload the page the way the OAuth redirect does.
    const { data: sub } = sb.auth.onAuthStateChange(
      (_e: unknown, session: { user?: { id?: string } } | null) => {
        const uid = session?.user?.id ?? null;
        userIdRef.current = uid;
        if (uid) {
          (async () => {
            try {
              await seedIfEmpty(sb, uid);
              const fresh = await fetchAll(sb, uid);
              if (!active) return;
              setDb(fresh);
              setNeedsAuth(false);
              setReady(true);
            } catch {
              /* leave gate as-is on transient errors */
            }
          })();
        } else {
          setNeedsAuth(true);
        }
      },
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Optimistic local commit (also persists in local mode). Updates dbRef
  // synchronously so several mutations dispatched in the same tick (e.g. a
  // batch add) each build on the previous one instead of clobbering it.
  const commit = useCallback((next: DB) => {
    dbRef.current = next;
    setDb(next);
    if (MODE === "local") {
      const ok = persistLocal(next);
      setStorageOk(ok);
    }
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

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const task = dbRef.current.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const subtasks = (task.subtasks ?? []).map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s,
      );
      commit({
        ...dbRef.current,
        tasks: dbRef.current.tasks.map((t) =>
          t.id === taskId ? { ...t, subtasks } : t,
        ),
      });
      wt((sb, u) => repo.updateTask(sb!, u, taskId, { subtasks }));
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

  // ── Daily Blueprint (routine) ────────────────────────────────────
  const addRoutineBlock = useCallback(
    (b: Omit<RoutineBlock, "id" | "created_at">) => {
      if (MODE === "supabase") {
        wt(async (sb, u) => {
          await repo.addRoutineBlock(sb!, u, b);
          await reload();
        });
        return;
      }
      commit({
        ...dbRef.current,
        routine_blocks: [
          ...dbRef.current.routine_blocks,
          { ...b, id: uid("blk"), created_at: new Date().toISOString() },
        ],
      });
    },
    [commit, wt, reload],
  );

  const updateRoutineBlock = useCallback(
    (id: string, patch: Partial<RoutineBlock>) => {
      commit({
        ...dbRef.current,
        routine_blocks: dbRef.current.routine_blocks.map((b) =>
          b.id === id ? { ...b, ...patch } : b,
        ),
      });
      wt((sb, u) => repo.updateRoutineBlock(sb!, u, id, patch));
    },
    [commit, wt],
  );

  const deleteRoutineBlock = useCallback(
    (id: string) => {
      commit({
        ...dbRef.current,
        routine_blocks: dbRef.current.routine_blocks.filter((b) => b.id !== id),
      });
      wt((sb, u) => repo.deleteRoutineBlock(sb!, u, id));
    },
    [commit, wt],
  );

  const applyDefaultDay = useCallback(() => {
    const base = dbRef.current;
    const slugId = (slug: string) =>
      base.areas.find((a) => a.slug === slug)?.id;
    const blocks = defaultDayBlocks(slugId);
    if (MODE === "supabase") {
      wt(async (sb, u) => {
        for (const b of blocks) await repo.addRoutineBlock(sb!, u, b);
        await reload();
      });
      return;
    }
    commit({
      ...base,
      routine_blocks: [
        ...base.routine_blocks,
        ...blocks.map((b) => ({
          ...b,
          id: uid("blk"),
          created_at: new Date().toISOString(),
        })),
      ],
    });
  }, [commit, wt, reload]);

  // Re-add the default starter habits (mapped to existing areas by slug),
  // skipping any that already exist. Works in both local and Supabase mode.
  const restoreStarterHabits = useCallback(() => {
    const base = dbRef.current;
    const bySlug = (s: string) => base.areas.find((a) => a.slug === s)?.id;
    const defaults: {
      slug: string;
      title: string;
      target_time: string | null;
    }[] = [
      { slug: "health", title: "Sleep well", target_time: "21:30" },
      { slug: "health", title: "Regular exercise", target_time: null },
      { slug: "relationship", title: "Train Benjamim", target_time: null },
    ];
    for (const d of defaults) {
      const areaId = bySlug(d.slug);
      if (!areaId) continue;
      const exists = base.habits.some(
        (h) =>
          h.area_id === areaId &&
          h.title.toLowerCase() === d.title.toLowerCase(),
      );
      if (exists) continue;
      addHabit({
        area_id: areaId,
        title: d.title,
        cadence: "daily",
        target_time: d.target_time,
        active: true,
      });
    }
  }, [addHabit]);

  const value = useMemo<StoreApi>(
    () => ({
      db,
      ready,
      mode: MODE,
      needsAuth,
      storageOk,
      updateArea,
      addGoal,
      updateGoal,
      deleteGoal,
      addTask,
      updateTask,
      deleteTask,
      cycleTaskStatus,
      toggleSubtask,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      saveReview,
      snapshotScores,
      simulateHistory,
      resetDemo,
      addRoutineBlock,
      updateRoutineBlock,
      deleteRoutineBlock,
      applyDefaultDay,
      restoreStarterHabits,
    }),
    [
      db,
      ready,
      needsAuth,
      storageOk,
      updateArea,
      addGoal,
      updateGoal,
      deleteGoal,
      addTask,
      updateTask,
      deleteTask,
      cycleTaskStatus,
      toggleSubtask,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      saveReview,
      snapshotScores,
      simulateHistory,
      resetDemo,
      addRoutineBlock,
      updateRoutineBlock,
      deleteRoutineBlock,
      applyDefaultDay,
      restoreStarterHabits,
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
