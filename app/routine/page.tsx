"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { sortedBlocks, currentRoutineBlock } from "@/lib/routine";
import { fmtTime } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { RoutineBlockEditor } from "@/components/editors";
import { cn, haptic } from "@/lib/utils";
import type { RoutineBlock } from "@/lib/types";

export default function RoutinePage() {
  const { db, ready, applyDefaultDay } = useStore();
  const [editor, setEditor] = useState<{ open: boolean; block?: RoutineBlock | null }>(
    { open: false },
  );
  // Re-render each minute so the "now" highlight stays accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  if (!ready)
    return <div className="mt-10 h-40 animate-pulse rounded-ios bg-surface-2" />;

  const blocks = sortedBlocks(db);
  const { block: nowBlock, upcoming } = currentRoutineBlock(db);
  const areaById = (id?: string | null) =>
    id ? db.areas.find((a) => a.id === id) : undefined;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Daily Blueprint"
        title="My Working Day"
        action={
          blocks.length > 0 ? (
            <button
              onClick={() => {
                haptic();
                setEditor({ open: true, block: null });
              }}
              className="active-press tappable inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-tint"
            >
              <Icon name="Plus" size={15} /> Block
            </button>
          ) : undefined
        }
      />

      {blocks.length === 0 ? (
        <Card className="px-5 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-ios bg-tint/10 text-tint">
            <Icon name="Sunrise" size={30} />
          </div>
          <p className="mt-4 text-[18px] font-bold text-ink">
            Design your normal day
          </p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-3">
            Build the rhythm of a typical working day once. It becomes your base
            — refine it over time, and it tells you what to do whenever nothing
            else is scheduled.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => applyDefaultDay()}>
              <Icon name="Sunrise" size={18} /> Start with a template
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditor({ open: true, block: null })}
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

          {/* Timeline */}
          <Card className="divide-y divide-border/60 px-4">
            {blocks.map((b) => {
              const area = areaById(b.area_id);
              const isNow = nowBlock?.id === b.id && !upcoming;
              return (
                <button
                  key={b.id}
                  onClick={() => setEditor({ open: true, block: b })}
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
            })}
          </Card>

          <p className="mt-4 px-1 text-center text-[12px] text-ink-3">
            This is your base day. When nothing is scheduled, the{" "}
            <span className="font-semibold text-ink-2">Right now</span> block on
            Today tells you what to focus on.
          </p>
        </>
      )}

      <RoutineBlockEditor
        block={editor.block}
        open={editor.open}
        onClose={() => setEditor({ open: false })}
      />
    </div>
  );
}
