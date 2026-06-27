"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, inputClass, Button, Segmented, useToast } from "./ui";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { cn, uid } from "@/lib/utils";
import type {
  Goal,
  Task,
  Habit,
  Priority,
  TaskStatus,
  GoalStatus,
  Subtask,
  RoutineBlock,
} from "@/lib/types";

// Goal editor ----------------------------------------------------------------
export function GoalEditor({
  areaId,
  goal,
  open,
  onClose,
}: {
  areaId: string;
  goal?: Goal | null;
  open: boolean;
  onClose: () => void;
}) {
  const { addGoal, updateGoal, deleteGoal } = useStore();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GoalStatus>("active");

  useEffect(() => {
    if (open) {
      setTitle(goal?.title ?? "");
      setDescription(goal?.description ?? "");
      setProgress(goal?.progress ?? 0);
      setStatus(goal?.status ?? "active");
    }
  }, [open, goal]);

  const save = () => {
    if (!title.trim()) return;
    if (goal) {
      updateGoal(goal.id, { title, description, progress, status });
      show("Goal updated");
    } else {
      addGoal({ area_id: areaId, title, description, progress, status });
      show("Goal added");
    }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={goal ? "Edit Goal" : "New Goal"}>
      <div className="space-y-4">
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            autoFocus
            placeholder="What do you want to achieve?"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className={inputClass}
            rows={2}
            value={description}
            placeholder="Optional details"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "done", label: "Done" },
            ]}
          />
        </Field>
        <Field label={`Progress — ${progress}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full"
          />
        </Field>
        <div className="flex gap-3 pt-1">
          {goal && (
            <Button
              variant="danger"
              className="px-4"
              onClick={() => {
                deleteGoal(goal.id);
                show("Goal deleted");
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {goal ? "Save" : "Add Goal"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// Task editor ----------------------------------------------------------------
export function TaskEditor({
  areaId,
  goalId,
  task,
  open,
  onClose,
}: {
  areaId: string;
  goalId?: string | null;
  task?: Task | null;
  open: boolean;
  onClose: () => void;
}) {
  const { addTask, updateTask, deleteTask } = useStore();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [due, setDue] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setNotes(task?.notes ?? "");
      setPriority(task?.priority ?? "med");
      setStatus(task?.status ?? "todo");
      setDue(task?.due_date ?? "");
      setStart(task?.scheduled_start ?? "");
      setEnd(task?.scheduled_end ?? "");
      setSubtasks(task?.subtasks ?? []);
      setNewSub("");
    }
  }, [open, task]);

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    setSubtasks((s) => [...s, { id: uid("sub"), title: t, done: false }]);
    setNewSub("");
  };

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      area_id: areaId,
      goal_id: task?.goal_id ?? goalId ?? null,
      title,
      notes,
      priority,
      status,
      due_date: due || null,
      scheduled_start: start || null,
      scheduled_end: end || null,
      subtasks,
    };
    if (task) {
      updateTask(task.id, payload);
      show("Task updated");
    } else {
      addTask(payload);
      show("Task added");
    }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={task ? "Edit Task" : "New Task"}>
      <div className="space-y-4">
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            autoFocus
            placeholder="What needs doing?"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            placeholder="Optional details"
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {/* Subtasks */}
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 px-1 text-[13px] font-medium text-ink-3">
            <Icon name="ListTree" size={14} /> Subtasks
          </span>
          {subtasks.length > 0 && (
            <div className="mb-2 space-y-1">
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2"
                >
                  <button
                    onClick={() =>
                      setSubtasks((arr) =>
                        arr.map((x) =>
                          x.id === s.id ? { ...x, done: !x.done } : x,
                        ),
                      )
                    }
                    className="tappable shrink-0 text-tint"
                    aria-label="Toggle subtask"
                  >
                    <Icon name={s.done ? "SquareCheck" : "Square"} size={20} />
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-[15px]",
                      s.done && "text-ink-3 line-through",
                    )}
                  >
                    {s.title}
                  </span>
                  <button
                    onClick={() =>
                      setSubtasks((arr) => arr.filter((x) => x.id !== s.id))
                    }
                    className="tappable shrink-0 text-ink-3"
                    aria-label="Remove subtask"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              className={inputClass}
              value={newSub}
              placeholder="Add a step…"
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSub();
                }
              }}
            />
            <Button variant="secondary" className="px-4" onClick={addSub}>
              <Icon name="Plus" size={18} />
            </Button>
          </div>
        </div>

        <Field label="Priority">
          <Segmented
            value={priority}
            onChange={setPriority}
            options={[
              { value: "low", label: "Low" },
              { value: "med", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </Field>
        <Field label="Status">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "todo", label: "To-do" },
              { value: "doing", label: "Doing" },
              { value: "done", label: "Done" },
            ]}
          />
        </Field>
        <Field label="Due date">
          <input
            type="date"
            className={inputClass}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Scheduled start">
            <input
              type="datetime-local"
              className={inputClass}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Scheduled end">
            <input
              type="datetime-local"
              className={inputClass}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        <p className="px-1 text-[12px] text-ink-3">
          Scheduling a task will create a Google Calendar event once Calendar
          sync is connected.
        </p>
        <div className="flex gap-3 pt-1">
          {task && (
            <Button
              variant="danger"
              className="px-4"
              onClick={() => {
                deleteTask(task.id);
                show("Task deleted");
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {task ? "Save" : "Add Task"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// Habit editor ---------------------------------------------------------------
export function HabitEditor({
  areaId,
  habit,
  open,
  onClose,
}: {
  areaId: string;
  habit?: Habit | null;
  open: boolean;
  onClose: () => void;
}) {
  const { addHabit, updateHabit, deleteHabit } = useStore();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<Habit["cadence"]>("daily");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(habit?.title ?? "");
      setCadence(habit?.cadence ?? "daily");
      setTime(habit?.target_time ?? "");
    }
  }, [open, habit]);

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      area_id: areaId,
      title,
      cadence,
      target_time: time || null,
      active: true,
    };
    if (habit) {
      updateHabit(habit.id, payload);
      show("Habit updated");
    } else {
      addHabit(payload);
      show("Habit added");
    }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={habit ? "Edit Habit" : "New Habit"}>
      <div className="space-y-4">
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            autoFocus
            placeholder="e.g. Sleep well"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Cadence">
          <Segmented
            value={cadence}
            onChange={setCadence}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </Field>
        <Field label="Target time (optional)">
          <input
            type="time"
            className={inputClass}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
        <div className="flex gap-3 pt-1">
          {habit && (
            <Button
              variant="danger"
              className="px-4"
              onClick={() => {
                deleteHabit(habit.id);
                show("Habit deleted");
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {habit ? "Save" : "Add Habit"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// Routine block editor (Daily Blueprint) -------------------------------------
export function RoutineBlockEditor({
  block,
  open,
  onClose,
}: {
  block?: RoutineBlock | null;
  open: boolean;
  onClose: () => void;
}) {
  const { db, addRoutineBlock, updateRoutineBlock, deleteRoutineBlock } =
    useStore();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(block?.title ?? "");
      setStart(block?.start_time ?? "09:00");
      setEnd(block?.end_time ?? "");
      setAreaId(block?.area_id ?? "");
      setNote(block?.note ?? "");
    }
  }, [open, block]);

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      title,
      start_time: start,
      end_time: end || null,
      area_id: areaId || null,
      note: note || null,
      sort_order: block?.sort_order ?? db.routine_blocks.length,
    };
    if (block) {
      updateRoutineBlock(block.id, payload);
      show("Block updated");
    } else {
      addRoutineBlock(payload);
      show("Block added");
    }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={block ? "Edit Block" : "New Block"}>
      <div className="space-y-4">
        <Field label="What are you doing?">
          <input
            className={inputClass}
            value={title}
            autoFocus
            placeholder="e.g. Trading / deep work"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <input
              type="time"
              className={inputClass}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="End (optional)">
            <input
              type="time"
              className={inputClass}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Life area (optional)">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAreaId("")}
              className={cn(
                "tappable rounded-full px-3 py-1.5 text-[13px] font-semibold",
                areaId === "" ? "bg-tint text-white" : "bg-surface-2 text-ink-3",
              )}
            >
              None
            </button>
            {db.areas.map((a) => (
              <button
                key={a.id}
                onClick={() => setAreaId(a.id)}
                className="tappable rounded-full px-3 py-1.5 text-[13px] font-semibold"
                style={
                  areaId === a.id
                    ? { background: a.color, color: "#fff" }
                    : { background: `${a.color}1A`, color: a.color }
                }
              >
                {a.name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Note (optional)">
          <input
            className={inputClass}
            value={note}
            placeholder="e.g. Highest-focus block"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="flex gap-3 pt-1">
          {block && (
            <Button
              variant="danger"
              className="px-4"
              onClick={() => {
                deleteRoutineBlock(block.id);
                show("Block deleted");
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {block ? "Save" : "Add Block"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
