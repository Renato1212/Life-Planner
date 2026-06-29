"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { sortedBlocks, currentRoutineBlock } from "@/lib/routine";
import { isHabitDoneOn, currentStreak } from "@/lib/scoring";
import { fmtTime, todayISO } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { HabitRow } from "@/components/rows";
import { RoutineBlockEditor, HabitEditor } from "@/components/editors";
import { cn, haptic } from "@/lib/utils";
import type { RoutineBlock, Habit } from "@/lib/types";

const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

type Item =
  | { kind: "block"; t: number; block: RoutineBlock }
  | { kind: "habit"; t: number; habit: Habit };

export default function RoutinePage() {
  const { db, ready, applyDefaultDay, toggleHabit } = useStore();
  const [blockEditor, setBlockEditor] = useState<{
    open: boolean;
    block?: RoutineBlock | null;
  }>({ open: false });
  const [habitEditor, setHabitEditor] = useState<Habit | null>(null);

  // Re-render each minute so the "now" highlight stays accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  if (!ready)
    return <div className="mt-10 h-40 animate-pulse rounded-ios bg-surface-2" />;

  const today = todayISO();
  const blocks = sortedBlocks(db);
  const habits = db.habits.filter((h) => h.active);
  const timedHabits = habits.filter((h) => h.target_time);
  const anytimeHabits = habits.filter((h) => !h.target_time);
  const { block: nowBlock, upcoming } = currentRoutineBlock(db);
  const areaById = (id?: string | null) =>
    id ? db.areas.find((a) => a.id === id) : undefined;

  // Merge blocks + timed habits into one chronological day timeline.
  const timeline: Item[] = [
    ...blocks.map((b) => ({ kind: "block" as const, t: hm(b.start_time), block: b })),
    ...timedHabits.map((h) => ({
      kind: "habit" as const,
      t: hm(h.target_time as string),
      habit: h,
    })),
  ].sort((a, b) => a.t - b.t);

  const nothing =
    blocks.length === 0 && timedHabits.length === 0 && anytimeHabits.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Daily Blueprint"
        title="My Working Day"
        action={
          !nothing ? (
            <button
              onClick={() => {
                haptic();
                setBlockEditor({ open: true, block: null });
              }}
              className="active-press tappable inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-tint"
            >
              <Icon name="Plus" size={15} /> Block
            </button>
          ) : undefined
        }
      />

      {nothing ? (
        <Card className="px-5 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-ios bg-tint/10 text-tint">
            <Icon name="Sunrise" size={30} />
          </div>
          <p className="mt-4 text-[18px] font-bold text-ink">
            Design your normal day
          </p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-3">
            Build the rhythm of a typical working day once. Your habits from each
            area show up here automatically — refine it over time, and it tells
            you what to do whenever nothing else is scheduled.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => applyDefaultDay()}>
              <Icon name="Sunrise" size={18} /> Start with a template
            </Button>
            <Button
              variant="secondary"
              onClick={() => setBlockEditor({ open: true, block: null })}
            >
              <Icon name="Plus" size={18} /> Build from scratch
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Right now */}
          {nowBlock && (
            <Card className="mb-4 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-tint">
                {upcoming ? "Up next" : "Right now"}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <span
                  className="h-10 w-1.5 rounded-full"
                  style={{
                    background:
                      areaById(nowBlock.area_id)?.color ?? "rgb(var(--tint))",
                  }}
                />
                <div className="flex-1">
                  <p className="text-[19px] font-bold text-ink">
                    {nowBlock.title}
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {fmtTime(nowBlock.start_time)}
                    {nowBlock.end_time ? ` – ${fmtTime(nowBlock.end_time)}` : ""}
                    {nowBlock.note ? ` · ${nowBlock.note}` : ""}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline: blocks + timed habits */}
          <Card className="divide-y divide-border/60 px-4">
            {timeline.map((item) => {
              if (item.kind === "block") {
                const b = item.block;
                const area = areaById(b.area_id);
                const isNow = nowBlock?.id === b.id && !upcoming;
                return (
                  <button
                    key={`b-${b.id}`}
                    onClick={() => setBlockEditor({ open: true, block: b })}
                    className="tappable flex w-full items-stretch gap-3 py-3 text-left"
                  >
                    <div className="w-14 shrink-0 pt-0.5 text-right text-[13px] font-semibold tabular-nums text-ink-2">
                      {fmtTime(b.start_time).replace(" ", "")}
                    </div>
                    <div
                      className="w-1 shrink-0 rounded-full"
                      style={{ background: area?.color ?? "rgb(var(--border))" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-medium text-ink">
                          {b.title}
                        </span>
                        {isNow && (
                          <span className="shrink-0 rounded-full bg-tint px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Now
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[13px] text-ink-3">
                        {b.end_time ? `until ${fmtTime(b.end_time)}` : "open-ended"}
                        {area ? ` · ${area.name}` : ""}
                        {b.note ? ` · ${b.note}` : ""}
                      </div>
                    </div>
                  </button>
                );
              }
              // Timed habit
              const h = item.habit;
              const area = areaById(h.area_id);
              const done = isHabitDoneOn(db, h.id, today);
              const streak = currentStreak(db, h.id);
              return (
                <div
                  key={`h-${h.id}`}
                  className="flex items-stretch gap-3 py-3"
                >
                  <div className="w-14 shrink-0 pt-1 text-right text-[13px] font-semibold tabular-nums text-ink-2">
                    {fmtTime(h.target_time as string).replace(" ", "")}
                  </div>
                  <button
                    onClick={() => {
                      haptic(done ? 6 : 14);
                      toggleHabit(h.id);
                    }}
                    className={cn(
                      "tappable active-press grid h-7 w-7 shrink-0 self-center place-items-center rounded-full border-2 transition-all",
                      done ? "border-green-500 bg-green-500 animate-pop" : "",
                    )}
                    style={
                      done ? undefined : { borderColor: area?.color ?? "#999" }
                    }
                    aria-label="Toggle habit"
                  >
                    {done && (
                      <Icon name="Check" size={15} className="text-white" strokeWidth={3} />
                    )}
                  </button>
                  <button
                    onClick={() => setHabitEditor(h)}
                    className="tappable min-w-0 flex-1 self-center text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-[16px] font-medium text-ink",
                          done && "text-ink-3 line-through",
                        )}
                      >
                        {h.title}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
                        <Icon name="Repeat" size={10} /> Habit
                      </span>
                    </div>
                    <div className="truncate text-[13px] text-ink-3">
                      {area ? area.name : "Habit"}
                      {h.cadence ? ` · ${h.cadence}` : ""}
                    </div>
                  </button>
                  {streak > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full bg-orange-500/10 px-2.5 py-1 text-[13px] font-semibold text-orange-500">
                      <Icon name="Flame" size={14} /> {streak}
                    </span>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Anytime habits (no target time) */}
          {anytimeHabits.length > 0 && (
            <div className="mt-5">
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
                <Icon name="Repeat" size={14} /> Anytime habits
              </p>
              <Card className="px-4 py-1">
                {anytimeHabits.map((h, i) => {
                  const area = areaById(h.area_id);
                  return (
                    <div
                      key={h.id}
                      className={i > 0 ? "border-t border-border/60" : ""}
                    >
                      <div className="flex items-center gap-2">
                        {area && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: area.color }}
                          />
                        )}
                        <div className="flex-1">
                          <HabitRow habit={h} onEdit={setHabitEditor} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {blocks.length === 0 && (
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => applyDefaultDay()}
            >
              <Icon name="Sunrise" size={18} /> Add a starter day around your habits
            </Button>
          )}

          <p className="mt-4 px-1 text-center text-[12px] text-ink-3">
            Your habits from each area appear here automatically. Check them off
            and it updates Today, the area pages, and your scores.
          </p>
        </>
      )}

      <RoutineBlockEditor
        block={blockEditor.block}
        open={blockEditor.open}
        onClose={() => setBlockEditor({ open: false })}
      />
      {habitEditor && (
        <HabitEditor
          areaId={habitEditor.area_id}
          habit={habitEditor}
          open={!!habitEditor}
          onClose={() => setHabitEditor(null)}
        />
      )}
    </div>
  );
}
