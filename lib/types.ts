// Domain types. These mirror the planned Supabase schema 1:1 so a Supabase
// adapter can replace the local store without changing any UI code.

export type AreaSlug = "wealth" | "health" | "relationship";

export type GoalStatus = "active" | "done" | "paused";
export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "low" | "med" | "high";
export type Cadence = "daily" | "weekly" | "custom";

export interface Area {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string; // lucide icon name
  sort_order: number;
  created_at: string;
}

export interface Goal {
  id: string;
  area_id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  target_date?: string | null;
  progress: number; // 0-100
  created_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  area_id: string;
  goal_id?: string | null;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  subtasks?: Subtask[];
  google_event_id?: string | null;
  last_synced_at?: string | null;
  created_at: string;
}

// A reusable block of the user's "normal working day" — the Daily Blueprint.
// Provides a base to refine over time and a fallback for "what to do now"
// when nothing specific is scheduled.
export interface RoutineBlock {
  id: string;
  title: string;
  start_time: string; // "HH:MM"
  end_time?: string | null; // "HH:MM"
  area_id?: string | null;
  note?: string | null;
  sort_order: number;
  created_at: string;
}

export interface Habit {
  id: string;
  area_id: string;
  title: string;
  cadence: Cadence;
  target_time?: string | null; // "21:30"
  rrule?: string | null;
  active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string; // YYYY-MM-DD
  completed: boolean;
  note?: string;
}

export interface AreaScore {
  id: string;
  area_id: string;
  week_start: string; // YYYY-MM-DD (Monday)
  score: number; // 0-100
  note?: string;
}

export interface Review {
  id: string;
  week_start: string;
  reflections: Record<string, string>; // areaId -> reflection
  focus?: string;
  created_at: string;
}

export interface DB {
  version: number;
  areas: Area[];
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  habit_logs: HabitLog[];
  area_scores: AreaScore[];
  reviews: Review[];
  routine_blocks: RoutineBlock[];
}
