"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { liveScores } from "@/lib/scoring";
import { isHabitDoneOn } from "@/lib/scoring";
import { todayISO } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
import { LifeWheel } from "@/components/LifeWheel";
import { Card, Ring } from "@/components/ui";
import { Icon } from "@/components/Icon";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { db, ready } = useStore();
  if (!ready) return <Skeleton />;

  const scores = liveScores(db);
  const overall =
    Math.round(
      db.areas.reduce((s, a) => s + (scores[a.id] ?? 0), 0) /
        Math.max(1, db.areas.length),
    ) || 0;
  const today = todayISO();

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow={greeting()} title="Your Life Wheel" />

      <Card className="p-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[13px] font-medium text-ink-3">This week</p>
            <p className="text-[15px] font-semibold text-ink">Balance overview</p>
          </div>
          <Ring value={overall} size={52} color="rgb(var(--tint))">
            <span className="text-[15px] font-bold tabular-nums text-ink">
              {overall}
            </span>
          </Ring>
        </div>
        <LifeWheel areas={db.areas} scores={scores} />
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {db.areas
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((area) => {
            const goals = db.goals.filter(
              (g) => g.area_id === area.id && g.status === "active",
            );
            const habits = db.habits.filter(
              (h) => h.area_id === area.id && h.active,
            );
            const habitsDone = habits.filter((h) =>
              isHabitDoneOn(db, h.id, today),
            ).length;
            const nextTask = db.tasks.find(
              (t) => t.area_id === area.id && t.status !== "done",
            );
            return (
              <Link key={area.id} href={`/area/${area.slug}`}>
                <Card className="h-full p-4 active-press tappable cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-2xl"
                      style={{ background: `${area.color}1A`, color: area.color }}
                    >
                      <Icon name={area.icon} size={20} />
                    </div>
                    <Ring value={scores[area.id] ?? 0} size={40} stroke={5} color={area.color}>
                      <span className="text-[12px] font-bold tabular-nums text-ink">
                        {scores[area.id] ?? 0}
                      </span>
                    </Ring>
                  </div>
                  <h3 className="mt-3 text-[17px] font-bold text-ink">
                    {area.name}
                  </h3>
                  <div className="mt-1 space-y-0.5 text-[13px] text-ink-3">
                    <p>
                      {goals.length} active {goals.length === 1 ? "goal" : "goals"}
                    </p>
                    <p>
                      {habits.length
                        ? `${habitsDone}/${habits.length} habits today`
                        : "No habits yet"}
                    </p>
                  </div>
                  {nextTask ? (
                    <p className="mt-2 truncate text-[12px] font-medium text-ink-2">
                      → {nextTask.title}
                    </p>
                  ) : (
                    <p className="mt-2 text-[12px] text-ink-3">All clear ✦</p>
                  )}
                </Card>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 w-48 rounded-2xl bg-surface-2 mt-6" />
      <div className="mt-6 h-72 rounded-ios bg-surface-2" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-ios bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
