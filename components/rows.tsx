"use client";

import { useStore } from "@/lib/store";
import type { Task, Habit, Goal } from "@/lib/types";
import { Icon } from "./Icon";
import { ProgressBar } from "./ui";
import { cn, haptic } from "@/lib/utils";
import { currentStreak } from "@/lib/scoring";
import { isHabitDoneOn } from "@/lib/scoring";
import { todayISO, fmtTime } from "@/lib/date";

const priorityColor: Record<string, string> = {
  high: "#FF3B30",
  med: "#FF9500",
  low: "#34C759",
};

const statusRing: Record<Task["status"], string> = {
  todo: "border-ink-3/50",
  doing: "border-amber-400",
  done: "border-tint bg-tint",
};

// Task row -------------------------------------------------------------------
export function TaskRow({
  task,
  onEdit,
  accent,
}: {
  task: Task;
  onEdit?: (t: Task) => void;
  accent?: string;
}) {
  const { cycleTaskStatus } = useStore();
  const done = task.status === "done";
  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        onClick={() => {
          haptic();
          cycleTaskStatus(task.id);
        }}
        className={cn(
          "tappable active-press grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
          statusRing[task.status],
        )}
        aria-label="Cycle status"
      >
        {done && <Icon name="Check" size={15} className="text-white" strokeWidth={3} />}
        {task.status === "doing" && (
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        )}
      </button>
      <button
        onClick={() => onEdit?.(task)}
        className="tappable min-w-0 flex-1 text-left"
      >
        <div
          className={cn(
            "truncate text-[16px] font-medium text-ink",
            done && "text-ink-3 line-through",
          )}
        >
          {task.title}
        </div>
        {(task.notes || task.due_date) && (
          <div className="truncate text-[13px] text-ink-3">
            {task.notes}
            {task.notes && task.due_date ? " · " : ""}
            {task.due_date ? `Due ${task.due_date}` : ""}
          </div>
        )}
      </button>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: priorityColor[task.priority] }}
        title={`${task.priority} priority`}
      />
    </div>
  );
}

// Habit row ------------------------------------------------------------------
export function HabitRow({
  habit,
  date = todayISO(),
  onEdit,
}: {
  habit: Habit;
  date?: string;
  onEdit?: (h: Habit) => void;
}) {
  const { db, toggleHabit } = useStore();
  const done = isHabitDoneOn(db, habit.id, date);
  const streak = currentStreak(db, habit.id);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        onClick={() => {
          haptic(done ? 6 : 14);
          toggleHabit(habit.id, date);
        }}
        className={cn(
          "tappable active-press grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-all",
          done ? "border-green-500 bg-green-500 animate-pop" : "border-ink-3/40",
        )}
        aria-label="Toggle habit"
      >
        {done && <Icon name="Check" size={18} className="text-white" strokeWidth={3} />}
      </button>
      <button
        onClick={() => onEdit?.(habit)}
        className="tappable min-w-0 flex-1 text-left"
      >
        <div className="truncate text-[16px] font-medium text-ink">
          {habit.title}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          <span className="capitalize">{habit.cadence}</span>
          {habit.target_time && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="Clock" size={12} /> {fmtTime(habit.target_time)}
              </span>
            </>
          )}
        </div>
      </button>
      {streak > 0 && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[13px] font-semibold text-orange-500">
          <Icon name="Flame" size={14} /> {streak}
        </span>
      )}
    </div>
  );
}

// Goal row -------------------------------------------------------------------
export function GoalRow({
  goal,
  taskCount,
  onEdit,
}: {
  goal: Goal;
  taskCount?: number;
  onEdit?: (g: Goal) => void;
}) {
  const pct = goal.status === "done" ? 100 : goal.progress;
  return (
    <button
      onClick={() => onEdit?.(goal)}
      className="tappable active-press w-full text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "truncate text-[16px] font-semibold text-ink",
              goal.status === "done" && "text-ink-3 line-through",
            )}
          >
            {goal.title}
          </span>
          {goal.status === "paused" && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">
              Paused
            </span>
          )}
        </div>
        <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-3">
          {pct}%
        </span>
      </div>
      {goal.description && (
        <p className="mt-0.5 truncate text-[13px] text-ink-3">{goal.description}</p>
      )}
      <div className="mt-2">
        <ProgressBar value={pct} />
      </div>
      {taskCount ? (
        <p className="mt-1.5 text-[12px] text-ink-3">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </p>
      ) : null}
    </button>
  );
}
