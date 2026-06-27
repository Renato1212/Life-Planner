"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { liveScores } from "@/lib/scoring";
import { Card, Button, Segmented, Ring } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoalRow, TaskRow, HabitRow } from "@/components/rows";
import { GoalEditor, TaskEditor, HabitEditor } from "@/components/editors";
import type { Goal, Task, Habit, TaskStatus } from "@/lib/types";
import { haptic } from "@/lib/utils";

type Tab = "goals" | "tasks" | "habits";

export function AreaClient() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { db, ready } = useStore();
  const [tab, setTab] = useState<Tab>("goals");

  const [goalEditor, setGoalEditor] = useState<{ open: boolean; goal?: Goal | null }>({
    open: false,
  });
  const [taskEditor, setTaskEditor] = useState<{ open: boolean; task?: Task | null }>({
    open: false,
  });
  const [habitEditor, setHabitEditor] = useState<{ open: boolean; habit?: Habit | null }>({
    open: false,
  });

  if (!ready) return <div className="mt-10 h-40 animate-pulse rounded-ios bg-surface-2" />;

  const area = db.areas.find((a) => a.slug === slug);
  if (!area)
    return (
      <div className="mt-20 text-center text-ink-3">
        Area not found.{" "}
        <button className="text-tint" onClick={() => router.push("/")}>
          Go home
        </button>
      </div>
    );

  const score = liveScores(db)[area.id] ?? 0;
  const goals = db.goals.filter((g) => g.area_id === area.id);
  const tasks = db.tasks.filter((t) => t.area_id === area.id);
  const habits = db.habits.filter((h) => h.area_id === area.id);

  const cols: { key: TaskStatus; label: string }[] = [
    { key: "todo", label: "To-do" },
    { key: "doing", label: "Doing" },
    { key: "done", label: "Done" },
  ];

  const openAdd = () => {
    haptic();
    if (tab === "goals") setGoalEditor({ open: true, goal: null });
    if (tab === "tasks") setTaskEditor({ open: true, task: null });
    if (tab === "habits") setHabitEditor({ open: true, habit: null });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <button
          onClick={() => router.back()}
          className="active-press tappable -ml-1 inline-flex items-center gap-0.5 text-[17px] font-medium text-tint"
        >
          <Icon name="ChevronLeft" size={22} /> Back
        </button>
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-4 pb-5">
        <div
          className="grid h-16 w-16 place-items-center rounded-ios"
          style={{ background: `${area.color}1A`, color: area.color }}
        >
          <Icon name={area.icon} size={30} />
        </div>
        <div className="flex-1">
          <h1 className="text-[30px] font-bold leading-tight text-ink">
            {area.name}
          </h1>
          <p className="text-[14px] text-ink-3">
            {goals.filter((g) => g.status === "active").length} goals ·{" "}
            {tasks.filter((t) => t.status !== "done").length} open tasks
          </p>
        </div>
        <Ring value={score} size={56} color={area.color}>
          <span className="text-[16px] font-bold tabular-nums text-ink">{score}</span>
        </Ring>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "goals", label: `Goals` },
          { value: "tasks", label: `Tasks` },
          { value: "habits", label: `Habits` },
        ]}
      />

      <div className="mt-4 space-y-3">
        {/* GOALS */}
        {tab === "goals" &&
          (goals.length ? (
            goals.map((g) => (
              <Card key={g.id} className="p-4">
                <GoalRow
                  goal={g}
                  taskCount={tasks.filter((t) => t.goal_id === g.id).length}
                  onEdit={(goal) => setGoalEditor({ open: true, goal })}
                />
              </Card>
            ))
          ) : (
            <Empty
              icon="Target"
              title="No goals yet"
              subtitle={`Set your first ${area.name.toLowerCase()} goal.`}
            />
          ))}

        {/* TASKS — kanban-ish */}
        {tab === "tasks" &&
          (tasks.length ? (
            cols.map((col) => {
              const items = tasks.filter((t) => t.status === col.key);
              if (!items.length) return null;
              return (
                <div key={col.key}>
                  <p className="mb-1 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
                    {col.label} · {items.length}
                  </p>
                  <Card className="px-4 py-1">
                    {items.map((t, i) => (
                      <div
                        key={t.id}
                        className={i > 0 ? "border-t border-border/60" : ""}
                      >
                        <TaskRow
                          task={t}
                          accent={area.color}
                          onEdit={(task) => setTaskEditor({ open: true, task })}
                        />
                      </div>
                    ))}
                  </Card>
                </div>
              );
            })
          ) : (
            <Empty
              icon="ListChecks"
              title="No tasks yet"
              subtitle="Break your goals into doable steps."
            />
          ))}

        {/* HABITS */}
        {tab === "habits" &&
          (habits.length ? (
            <Card className="px-4 py-1">
              {habits.map((h, i) => (
                <div key={h.id} className={i > 0 ? "border-t border-border/60" : ""}>
                  <HabitRow
                    habit={h}
                    onEdit={(habit) => setHabitEditor({ open: true, habit })}
                  />
                </div>
              ))}
            </Card>
          ) : (
            <Empty
              icon="Repeat"
              title="No habits yet"
              subtitle="Small daily reps compound over time."
            />
          ))}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="active-press tappable fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full text-white shadow-ios-lg"
        style={{ background: area.color }}
        aria-label="Add"
      >
        <Icon name="Plus" size={26} strokeWidth={2.5} />
      </button>

      <GoalEditor
        areaId={area.id}
        goal={goalEditor.goal}
        open={goalEditor.open}
        onClose={() => setGoalEditor({ open: false })}
      />
      <TaskEditor
        areaId={area.id}
        task={taskEditor.task}
        open={taskEditor.open}
        onClose={() => setTaskEditor({ open: false })}
      />
      <HabitEditor
        areaId={area.id}
        habit={habitEditor.habit}
        open={habitEditor.open}
        onClose={() => setHabitEditor({ open: false })}
      />
    </div>
  );
}

function Empty({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid place-items-center rounded-ios bg-surface/50 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-ink-3">
        <Icon name={icon} size={26} />
      </div>
      <p className="mt-3 text-[16px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[14px] text-ink-3">{subtitle}</p>
      <p className="mt-2 text-[13px] text-ink-3">Tap + to begin</p>
    </div>
  );
}
