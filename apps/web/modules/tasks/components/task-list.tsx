"use client";

import { useOptimistic, useState, useTransition } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlarmClockIcon } from "@hugeicons/core-free-icons";

import { formatTimeInZone } from "@/lib/day";
import { cn } from "@/lib/utils";
import { deleteTask, setTaskStatus, updateTask } from "../actions";
import type { TaskListItem, TaskStatus } from "../schema";
import { AddTaskInline } from "./add-task-inline";
import { EditTaskDialog, type TaskEdit } from "./task-dialog";
import { TaskCheckbox } from "./task-checkbox";

export function TaskList({
  tasks,
  day,
  timeZone,
}: {
  tasks: TaskListItem[];
  day: string;
  /** Reminder times are shown in the profile's zone, like everything else. */
  timeZone: string;
}) {
  const [error, setError] = useState<string | null>(null);
  // The row being edited. Held by id rather than by value so the dialog always
  // reads the current optimistic row, not a copy taken when it opened.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticTasks, patchTask] = useOptimistic(
    tasks,
    (
      current: TaskListItem[],
      next:
        | { kind: "status"; id: string; status: TaskStatus }
        | { kind: "edit"; id: string; values: TaskEdit }
        | { kind: "remove"; id: string }
        | { kind: "add"; task: TaskListItem },
    ) => {
      switch (next.kind) {
        case "add":
          return [...current, next.task];
        case "remove":
          return current.filter((task) => task.id !== next.id);
        case "status":
          return current.map((task) =>
            task.id === next.id ? { ...task, status: next.status } : task,
          );
        case "edit":
          return current.map((task) =>
            task.id === next.id
              ? {
                  ...task,
                  title: next.values.title,
                  body: next.values.body,
                  remind_at: next.values.remindAt,
                }
              : task,
          );
      }
    },
  );

  const editing = optimisticTasks.find((task) => task.id === editingId) ?? null;

  function toggle(task: TaskListItem) {
    const status: TaskStatus = task.status === "done" ? "todo" : "done";

    startTransition(async () => {
      patchTask({ kind: "status", id: task.id, status });
      const result = await setTaskStatus({ id: task.id, status });
      // On failure React drops the optimistic value when the transition
      // settles, so the row reverts itself. We only have to explain why.
      setError(result.ok ? null : result.error);
    });
  }

  function save(id: string, values: TaskEdit) {
    startTransition(async () => {
      patchTask({ kind: "edit", id, values });
      const result = await updateTask({
        id,
        title: values.title,
        body: values.body,
        remindAt: values.remindAt,
      });
      setError(result.ok ? null : result.error);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      patchTask({ kind: "remove", id });
      const result = await deleteTask({ id });
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col">
      {optimisticTasks.length === 0 ? (
        <p className="px-1 py-6 text-sm text-muted-foreground">
          Nothing planned yet. Add your first task below.
        </p>
      ) : (
        <ul className="flex flex-col">
          {optimisticTasks.map((task) => {
            const done = task.status === "done";
            return (
              <li
                key={task.id}
                className="flex items-start gap-3 border-b border-border/60 py-3 last:border-b-0"
              >
                <TaskCheckbox
                  checked={done}
                  onToggle={() => toggle(task)}
                  label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                  className="mt-0.5"
                />
                {/* The row itself opens the editor - a separate pencil would be
                    one more 24px target on a phone for the same job. */}
                <button
                  type="button"
                  onClick={() => setEditingId(task.id)}
                  aria-label={`Edit ${task.title}`}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <p
                    className={cn(
                      "truncate text-sm transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      done
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs whitespace-pre-line text-muted-foreground">
                      {task.body}
                    </p>
                  ) : null}
                  {task.remind_at ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <HugeiconsIcon icon={AlarmClockIcon} className="size-3.5" />
                      {formatTimeInZone(task.remind_at, timeZone)}
                    </p>
                  ) : null}
                  {task.projects?.name ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      from:{" "}
                      <span className="underline underline-offset-2">
                        {task.projects.name}
                      </span>
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddTaskInline
        day={day}
        onError={setError}
        onOptimistic={(title) =>
          patchTask({
            kind: "add",
            task: {
              // Only a React key until the server's row arrives.
              id: `pending-${crypto.randomUUID()}`,
              title,
              body: "",
              status: "todo",
              planned_date: day,
              planned_minutes: null,
              position: Number.MAX_SAFE_INTEGER,
              project_id: null,
              completed_at: null,
              remind_at: null,
              projects: null,
            },
          })
        }
      />

      <EditTaskDialog
        task={editing}
        onClose={() => setEditingId(null)}
        onSubmit={(values) => editing && save(editing.id, values)}
        onDelete={() => editing && remove(editing.id)}
      />

      {error ? (
        <p role="alert" className="pt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
