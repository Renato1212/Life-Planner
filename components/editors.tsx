"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, inputClass, Button, Segmented, useToast } from "./ui";
import { useStore } from "@/lib/store";
import type { Goal, Task, Habit, Priority, TaskStatus, GoalStatus } from "@/lib/types";

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

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setNotes(task?.notes ?? "");
      setPriority(task?.priority ?? "med");
      setStatus(task?.status ?? "todo");
      setDue(task?.due_date ?? "");
      setStart(task?.scheduled_start ?? "");
      setEnd(task?.scheduled_end ?? "");
    }
  }, [open, task]);

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
