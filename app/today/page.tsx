"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { isHabitDoneOn } from "@/lib/scoring";
import { currentRoutineBlock, activeScheduledTask } from "@/lib/routine";
import { todayISO, format, fmtTime } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
import { Card, Ring } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { HabitRow, TaskRow } from "@/components/rows";
import { TaskEditor, HabitEditor } from "@/components/editors";
import type { Task, Habit } from "@/lib/types";

export default function TodayPage() {
  const { db, ready } = useStore();
  const [taskEdit, setTaskEdit] = useState<Task | null>(null);
  const [habitEdit, setHabitEdit] = useState<Habit | null>(null);

  if (!ready)
    return <div className="mt-10 h-40 animate-pulse rounded-ios bg-surface-2" />;

  const today = todayISO();
  const areaById = (id: string) => db.areas.find((a) => a.id === id);

  const habits = db.habits.filter((h) => h.active);
  const habitsDone = habits.filter((h) => isHabitDoneOn(db, h.id, today)).length;

  // Today's tasks: due today, scheduled today, or any open "doing" task.
  const tasks = db.tasks.filter((t) => {
    if (t.status === "done") return false;
    const dueToday = t.due_date === today;
    const schedToday = t.scheduled_start?.slice(0, 10) === today;
    return dueToday || schedToday || t.status === "doing";
  });
  const pct =
    habits.length === 0
      ? 100
      : Math.round((habitsDone / habits.length) * 100);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={format(new Date(), "EEEE, MMM d")}
        title="Today"
      />

      <Card className="flex items-center gap-4 p-5">
        <Ring value={pct} size={72} stroke={8}>
          <div className="text-center">
            <div className="text-[18px] font-bold tabular-nums text-ink">{pct}%</div>
          </div>
        </Ring>
        <div>
          <p className="text-[17px] font-semibold text-ink">
            {habitsDone}/{habits.length} habits done
          </p>
          <p className="text-[14px] text-ink-3">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} on deck today
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            {pct === 100 ? "Beautiful. You showed up today. ✦" : "One rep at a time."}
          </p>
        </div>
      </Card>

      <RightNow />

      {/* Habits */}
      <SectionTitle icon="Repeat" label="Habits" />
      {habits.length ? (
        <Card className="px-4 py-1">
          {habits.map((h, i) => {
            const area = areaById(h.area_id);
            return (
              <div key={h.id} className={i > 0 ? "border-t border-border/60" : ""}>
                <div className="flex items-center gap-2">
                  {area && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: area.color }}
                    />
                  )}
                  <div className="flex-1">
                    <HabitRow habit={h} onEdit={setHabitEdit} />
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <EmptyMini text="No habits yet." />
      )}

      {/* Tasks */}
      <SectionTitle icon="ListChecks" label="Tasks" />
      {tasks.length ? (
        <Card className="px-4 py-1">
          {tasks.map((t, i) => {
            const area = areaById(t.area_id);
            return (
              <div key={t.id} className={i > 0 ? "border-t border-border/60" : ""}>
                <div className="flex items-center gap-2">
                  {area && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: area.color }}
                    />
                  )}
                  <div className="flex-1">
                    <TaskRow task={t} accent={area?.color} onEdit={setTaskEdit} />
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <EmptyMini text="Nothing scheduled or due today. Enjoy the calm. ✦" />
      )}

      {taskEdit && (
        <TaskEditor
          areaId={taskEdit.area_id}
          task={taskEdit}
          open={!!taskEdit}
          onClose={() => setTaskEdit(null)}
        />
      )}
      {habitEdit && (
        <HabitEditor
          areaId={habitEdit.area_id}
          habit={habitEdit}
          open={!!habitEdit}
          onClose={() => setHabitEdit(null)}
        />
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="mb-1.5 mt-6 flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
      <Icon name={icon} size={14} /> {label}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <Card className="px-4 py-6 text-center text-[14px] text-ink-3">{text}</Card>
  );
}

// "Right now" — what to focus on at this moment. Prefers an active scheduled
// task; otherwise falls back to the Daily Blueprint routine block.
function RightNow() {
  const { db } = useStore();
  const areaById = (id?: string | null) =>
    id ? db.areas.find((a) => a.id === id) : undefined;

  const task = activeScheduledTask(db);
  const { block, upcoming } = currentRoutineBlock(db);

  // Nothing set up yet → nudge to build the blueprint.
  if (!task && !block && db.routine_blocks.length === 0) {
    return (
      <Link href="/routine">
        <Card className="mt-4 flex items-center gap-3 p-4 active-press tappable cursor-pointer">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint/10 text-tint">
            <Icon name="Sunrise" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-ink">
              Set up your working day
            </p>
            <p className="text-[13px] text-ink-3">
              Build a base routine so you always know what to do next.
            </p>
          </div>
          <Icon name="ChevronRight" size={18} className="text-ink-3" />
        </Card>
      </Link>
    );
  }

  const label = task ? "Right now" : upcoming ? "Up next" : "Right now";
  const color = task
    ? areaById(task.area_id)?.color
    : areaById(block?.area_id)?.color;
  const title = task ? task.title : block?.title;
  const sub = task
    ? `${task.scheduled_start ? fmtTime(task.scheduled_start.slice(11, 16)) : ""} · scheduled task`
    : block
      ? `${fmtTime(block.start_time)}${block.end_time ? ` – ${fmtTime(block.end_time)}` : ""}${block.note ? ` · ${block.note}` : ""}`
      : "";

  return (
    <Card className="mt-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-tint">
          {label}
        </p>
        {!task && (
          <span className="text-[11px] font-medium text-ink-3">
            from your blueprint
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <span
          className="h-10 w-1.5 rounded-full"
          style={{ background: color ?? "rgb(var(--tint))" }}
        />
        <div className="flex-1">
          <p className="text-[19px] font-bold text-ink">{title}</p>
          <p className="text-[13px] text-ink-3">{sub}</p>
        </div>
      </div>
    </Card>
  );
}
