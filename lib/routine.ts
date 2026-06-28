import type { DB, RoutineBlock, Task } from "./types";
import { todayISO, parseISO, isSameDay } from "./date";

export function nowHM(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

// The blueprint is a daily timeline, so it always reads in chronological order
// by start time (sort_order is only a tiebreak for blocks at the same minute).
export function sortedBlocks(db: DB): RoutineBlock[] {
  return [...db.routine_blocks].sort(
    (a, b) =>
      hmToMin(a.start_time) - hmToMin(b.start_time) ||
      a.sort_order - b.sort_order,
  );
}

// The blueprint block covering the current time (or the next upcoming one).
export function currentRoutineBlock(
  db: DB,
  at: Date = new Date(),
): { block: RoutineBlock | null; upcoming: boolean } {
  const blocks = sortedBlocks(db);
  if (!blocks.length) return { block: null, upcoming: false };
  const now = hmToMin(nowHM(at));
  for (const b of blocks) {
    const start = hmToMin(b.start_time);
    const end = b.end_time ? hmToMin(b.end_time) : start + 30;
    if (now >= start && now < end) return { block: b, upcoming: false };
  }
  // No active block → next upcoming today.
  const next = blocks.find((b) => hmToMin(b.start_time) > now);
  return { block: next ?? null, upcoming: true };
}

// A scheduled task happening right now (today, within its scheduled window).
export function activeScheduledTask(db: DB, at: Date = new Date()): Task | null {
  const today = todayISO();
  return (
    db.tasks.find((t) => {
      if (t.status === "done" || !t.scheduled_start) return false;
      const start = parseISO(t.scheduled_start);
      if (!isSameDay(start, at)) return false;
      const end = t.scheduled_end
        ? parseISO(t.scheduled_end)
        : new Date(start.getTime() + 30 * 60000);
      return at >= start && at < end && today === todayISO();
    }) ?? null
  );
}
