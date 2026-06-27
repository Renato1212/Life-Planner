import type { DB, Area, Goal, Task, Habit } from "./types";
import { uid } from "./utils";

const now = () => new Date().toISOString();

// Stable IDs for the four seeded areas so deep links are predictable.
const AREA_IDS = {
  spiritual: "area_spiritual",
  wealth: "area_wealth",
  health: "area_health",
  relationship: "area_relationship",
};

export function buildSeed(): DB {
  const areas: Area[] = [
    {
      id: AREA_IDS.spiritual,
      name: "Spiritual",
      slug: "spiritual",
      color: "#8B7FD6",
      icon: "Sparkles",
      sort_order: 0,
      created_at: now(),
    },
    {
      id: AREA_IDS.wealth,
      name: "Wealth",
      slug: "wealth",
      color: "#3E9B7A",
      icon: "Wallet",
      sort_order: 1,
      created_at: now(),
    },
    {
      id: AREA_IDS.health,
      name: "Health",
      slug: "health",
      color: "#E08A5B",
      icon: "HeartPulse",
      sort_order: 2,
      created_at: now(),
    },
    {
      id: AREA_IDS.relationship,
      name: "Relationship",
      slug: "relationship",
      color: "#D97291",
      icon: "Users",
      sort_order: 3,
      created_at: now(),
    },
  ];

  const goals: Goal[] = [];
  const tasks: Task[] = [];
  const habits: Habit[] = [];

  const goal = (
    area_id: string,
    title: string,
    extra: Partial<Goal> = {},
  ): Goal => {
    const g: Goal = {
      id: uid("goal"),
      area_id,
      title,
      status: "active",
      progress: 0,
      created_at: now(),
      ...extra,
    };
    goals.push(g);
    return g;
  };

  const task = (
    area_id: string,
    title: string,
    extra: Partial<Task> = {},
  ): Task => {
    const t: Task = {
      id: uid("task"),
      area_id,
      goal_id: null,
      title,
      status: "todo",
      priority: "med",
      created_at: now(),
      ...extra,
    };
    tasks.push(t);
    return t;
  };

  const habit = (
    area_id: string,
    title: string,
    extra: Partial<Habit> = {},
  ): Habit => {
    const h: Habit = {
      id: uid("habit"),
      area_id,
      title,
      cadence: "daily",
      active: true,
      created_at: now(),
      ...extra,
    };
    habits.push(h);
    return h;
  };

  // ── Spiritual ── intentionally empty, ready to fill.

  // ── Wealth ──
  goal(AREA_IDS.wealth, "Pay my debt", { progress: 20 });
  goal(AREA_IDS.wealth, "AIMA (residency process)", { progress: 35 });
  goal(AREA_IDS.wealth, "Citizenship", { progress: 10 });
  goal(AREA_IDS.wealth, "Trading", { progress: 45 });

  // ── Health ──
  const fun = goal(AREA_IDS.health, "Fun", {
    description: "Off days, lunch time, train ride home",
    progress: 50,
  });
  task(AREA_IDS.health, "Off-day plan", {
    goal_id: fun.id,
    notes: "Protect a real off day",
    priority: "low",
  });
  const eatWell = goal(AREA_IDS.health, "Eat well", {
    description: "Free meals only on vacations / off days",
    progress: 40,
  });
  task(AREA_IDS.health, "Plan the week's meals", {
    goal_id: eatWell.id,
    priority: "med",
  });

  habit(AREA_IDS.health, "Sleep well", {
    cadence: "daily",
    target_time: "21:30",
  });
  habit(AREA_IDS.health, "Regular exercise", {
    cadence: "daily",
    target_time: null,
    rrule: "after trading",
  });

  task(AREA_IDS.health, "Medical exams", {
    priority: "high",
    notes: "Recurring Tuesday",
  });
  task(AREA_IDS.health, "Dental", {
    priority: "med",
    notes: "Recurring Wednesday",
  });

  const diabetes = goal(AREA_IDS.health, "Diabetes", { progress: 25 });
  task(AREA_IDS.health, "Book exams", { goal_id: diabetes.id, priority: "high" });
  task(AREA_IDS.health, "Talk with doctor", {
    goal_id: diabetes.id,
    priority: "high",
  });

  const prostate = goal(AREA_IDS.health, "Prostate", { progress: 15 });
  task(AREA_IDS.health, "Book exams", { goal_id: prostate.id, priority: "high" });
  task(AREA_IDS.health, "Talk with doctor", {
    goal_id: prostate.id,
    priority: "high",
  });

  const testosterone = goal(AREA_IDS.health, "Testosterone", { progress: 15 });
  task(AREA_IDS.health, "Book exams", {
    goal_id: testosterone.id,
    priority: "med",
  });
  task(AREA_IDS.health, "Talk with endocrinologist", {
    goal_id: testosterone.id,
    priority: "med",
  });

  const paroxetine = goal(AREA_IDS.health, "Paroxetine", { progress: 30 });
  task(AREA_IDS.health, "Talk with psychiatrist", {
    goal_id: paroxetine.id,
    priority: "med",
  });

  // ── Relationship ──
  const benjamim = goal(AREA_IDS.relationship, "Benjamim", { progress: 55 });
  habit(AREA_IDS.relationship, "Train Benjamim", { cadence: "daily" });
  task(AREA_IDS.relationship, "Play with him", {
    goal_id: benjamim.id,
    priority: "med",
  });

  const deysi = goal(AREA_IDS.relationship, "Deysi", { progress: 30 });
  task(AREA_IDS.relationship, "Buy the ring", {
    goal_id: deysi.id,
    priority: "high",
  });
  task(AREA_IDS.relationship, "Propose / marry", {
    goal_id: deysi.id,
    priority: "high",
  });

  return {
    version: 1,
    areas,
    goals,
    tasks,
    habits,
    habit_logs: [],
    area_scores: [],
    reviews: [],
  };
}
