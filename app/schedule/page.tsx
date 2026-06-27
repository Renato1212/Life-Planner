"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  weekDays,
  isSameDay,
  prettyDay,
  format,
  parseISO,
  addDays,
} from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
import { Card, Segmented, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TaskEditor } from "@/components/editors";
import { cn, haptic } from "@/lib/utils";
import type { Task } from "@/lib/types";

export default function SchedulePage() {
  const { db, ready, mode } = useStore();
  const { show } = useToast();
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [taskEdit, setTaskEdit] = useState<Task | null>(null);

  if (!ready)
    return <div className="mt-10 h-40 animate-pulse rounded-ios bg-surface-2" />;

  const days = weekDays(anchor);
  const areaById = (id: string) => db.areas.find((a) => a.id === id);

  const scheduledOn = (d: Date) =>
    db.tasks
      .filter((t) => t.scheduled_start && isSameDay(parseISO(t.scheduled_start), d))
      .sort((a, b) =>
        (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""),
      );

  const syncNow = async () => {
    haptic(12);
    if (mode !== "supabase") {
      show("Connect Google Calendar to sync (see README)");
      return;
    }
    show("Syncing…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");
      show(`Synced · ${data.pushed} sent, ${data.pulled} pulled`);
    } catch {
      show("Sync failed — check your connection");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={format(anchor, "MMMM yyyy")}
        title="Schedule"
        action={
          <button
            onClick={syncNow}
            className="active-press tappable inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-tint"
          >
            <Icon name="RefreshCw" size={15} /> Sync
          </button>
        }
      />

      <div className="mb-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
          ]}
        />
      </div>

      {/* Week strip */}
      <div className="mb-4 flex items-center gap-1">
        <button
          onClick={() => setAnchor(addDays(anchor, -7))}
          className="active-press tappable grid h-9 w-9 place-items-center rounded-full text-ink-3"
        >
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((d) => {
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, new Date());
            const count = scheduledOn(d).length;
            return (
              <button
                key={d.toISOString()}
                onClick={() => {
                  haptic();
                  setSelected(d);
                  if (view === "week") setView("day");
                }}
                className={cn(
                  "tappable flex flex-col items-center rounded-2xl py-2 transition-colors",
                  isSel ? "bg-tint text-white" : "text-ink",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isSel ? "text-white/80" : "text-ink-3",
                  )}
                >
                  {prettyDay(d)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[15px] font-semibold tabular-nums",
                    isToday && !isSel && "text-tint",
                  )}
                >
                  {format(d, "d")}
                </span>
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    count ? (isSel ? "bg-white" : "bg-tint") : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setAnchor(addDays(anchor, 7))}
          className="active-press tappable grid h-9 w-9 place-items-center rounded-full text-ink-3"
        >
          <Icon name="ChevronRight" size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-3 flex items-center gap-4 px-1 text-[12px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-tint" /> From Quadrante
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-ink-3" /> From Google
        </span>
      </div>

      {/* Agenda */}
      {view === "day" ? (
        <DayAgenda
          day={selected}
          tasks={scheduledOn(selected)}
          areaById={areaById}
          onEdit={setTaskEdit}
        />
      ) : (
        <div className="space-y-4">
          {days.map((d) => {
            const items = scheduledOn(d);
            if (!items.length) return null;
            return (
              <div key={d.toISOString()}>
                <p className="mb-1 px-1 text-[13px] font-semibold text-ink-2">
                  {format(d, "EEEE, MMM d")}
                </p>
                <DayAgenda
                  day={d}
                  tasks={items}
                  areaById={areaById}
                  onEdit={setTaskEdit}
                  compact
                />
              </div>
            );
          })}
          {days.every((d) => !scheduledOn(d).length) && (
            <Card className="px-4 py-10 text-center text-[14px] text-ink-3">
              Nothing scheduled this week.
            </Card>
          )}
        </div>
      )}

      {taskEdit && (
        <TaskEditor
          areaId={taskEdit.area_id}
          task={taskEdit}
          open={!!taskEdit}
          onClose={() => setTaskEdit(null)}
        />
      )}
    </div>
  );
}

function DayAgenda({
  day,
  tasks,
  areaById,
  onEdit,
  compact,
}: {
  day: Date;
  tasks: Task[];
  areaById: (id: string) => { color: string; name: string } | undefined;
  onEdit: (t: Task) => void;
  compact?: boolean;
}) {
  if (!tasks.length && !compact) {
    return (
      <Card className="px-4 py-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-ink-3">
          <Icon name="CalendarDays" size={26} />
        </div>
        <p className="mt-3 text-[16px] font-semibold text-ink">Open day</p>
        <p className="mt-0.5 text-[14px] text-ink-3">
          Schedule a task to see it here and on Google Calendar.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border/60 px-4">
      {tasks.map((t) => {
        const area = areaById(t.area_id);
        const start = t.scheduled_start ? parseISO(t.scheduled_start) : null;
        const end = t.scheduled_end ? parseISO(t.scheduled_end) : null;
        return (
          <button
            key={t.id}
            onClick={() => onEdit(t)}
            className="tappable flex w-full items-stretch gap-3 py-3 text-left"
          >
            <div className="w-14 shrink-0 pt-0.5 text-right text-[13px] font-semibold tabular-nums text-ink-2">
              {start ? format(start, "h:mm") : "—"}
              <div className="text-[11px] font-normal text-ink-3">
                {start ? format(start, "a") : ""}
              </div>
            </div>
            <div
              className="w-1 shrink-0 rounded-full"
              style={{ background: area?.color ?? "rgb(var(--tint))" }}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-[16px] font-medium text-ink",
                  t.status === "done" && "text-ink-3 line-through",
                )}
              >
                {t.title}
              </div>
              <div className="text-[13px] text-ink-3">
                {area?.name}
                {start && end ? ` · ${format(start, "h:mm a")}–${format(end, "h:mm a")}` : ""}
              </div>
            </div>
            <span className="self-center rounded-full bg-tint/10 px-2 py-0.5 text-[11px] font-semibold text-tint">
              Quadrante
            </span>
          </button>
        );
      })}
    </Card>
  );
}
