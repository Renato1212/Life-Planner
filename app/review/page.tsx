"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { liveScores } from "@/lib/scoring";
import { weekStartISO, format, parseISO } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button, ProgressBar, inputClass, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrendsChart } from "@/components/TrendsChart";

export default function ReviewPage() {
  const { db, ready, saveReview, snapshotScores, simulateHistory, resetDemo } =
    useStore();
  const { show } = useToast();
  const week = weekStartISO();

  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [focus, setFocus] = useState("");

  useEffect(() => {
    if (!ready) return;
    const existing = db.reviews.find((r) => r.week_start === week);
    if (existing) {
      setReflections(existing.reflections ?? {});
      setFocus(existing.focus ?? "");
    }
  }, [ready, db.reviews, week]);

  if (!ready)
    return <div className="mt-10 h-40 animate-pulse rounded-ios bg-surface-2" />;

  const scores = liveScores(db);
  const save = () => {
    snapshotScores();
    saveReview({ week_start: week, reflections, focus });
    show("Weekly review saved ✦");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={`Week of ${format(parseISO(week), "MMM d")}`}
        title="Weekly Review"
      />

      <p className="mb-4 px-1 text-[14px] text-ink-3">
        Two minutes. See where you stand, jot one honest line per area, set next
        week&apos;s focus.
      </p>

      {/* This week's scores */}
      <Card className="p-5">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
          This week&apos;s scores
        </p>
        <div className="space-y-3">
          {db.areas.map((a) => (
            <div key={a.id} className="flex items-center gap-3">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                style={{ background: `${a.color}1A`, color: a.color }}
              >
                <Icon name={a.icon} size={16} />
              </span>
              <span className="w-24 shrink-0 text-[14px] font-medium text-ink">
                {a.name}
              </span>
              <div className="flex-1">
                <ProgressBar value={scores[a.id] ?? 0} color={a.color} />
              </div>
              <span className="w-9 shrink-0 text-right text-[14px] font-semibold tabular-nums text-ink-2">
                {scores[a.id] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Trends */}
      <div className="mt-4">
        <p className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
          Trends over time
        </p>
        <Card className="p-4">
          <TrendsChart areas={db.areas} scores={db.area_scores} />
        </Card>
      </div>

      {/* Reflections */}
      <div className="mt-4 space-y-3">
        <p className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
          Reflections
        </p>
        {db.areas.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: a.color }}
              />
              <span className="text-[15px] font-semibold text-ink">{a.name}</span>
            </div>
            <textarea
              className={inputClass}
              rows={2}
              placeholder={`How did ${a.name.toLowerCase()} go this week?`}
              value={reflections[a.id] ?? ""}
              onChange={(e) =>
                setReflections((r) => ({ ...r, [a.id]: e.target.value }))
              }
            />
          </Card>
        ))}
      </div>

      {/* Next week focus */}
      <Card className="mt-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="Target" size={16} className="text-tint" />
          <span className="text-[15px] font-semibold text-ink">
            Next week&apos;s focus
          </span>
        </div>
        <input
          className={inputClass}
          placeholder="One thing to lean into…"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />
      </Card>

      <div className="mt-5">
        <Button className="w-full" onClick={save}>
          <Icon name="Check" size={18} /> Save weekly review
        </Button>
      </div>

      {/* Demo helpers */}
      <div className="mt-8 rounded-ios border border-dashed border-border p-4">
        <p className="text-[13px] font-semibold text-ink-2">Demo tools</p>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Populate streaks and trends to preview a few weeks of progress, or
          reset to the seeded starting data.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              simulateHistory();
              show("Simulated 5 weeks of history");
            }}
          >
            <Icon name="TrendingUp" size={16} /> Simulate a week
          </Button>
          <Button
            variant="secondary"
            className="px-4"
            onClick={() => {
              if (confirm("Reset all data to the seeded starting point?")) {
                resetDemo();
                show("Reset to seed data");
              }
            }}
          >
            <Icon name="RefreshCw" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
