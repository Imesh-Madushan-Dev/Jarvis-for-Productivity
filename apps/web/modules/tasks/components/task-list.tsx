"use client";

import { useOptimistic, useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { setTaskStatus } from "../actions";
import type { TaskListItem, TaskStatus } from "../schema";
import { AddTaskInline } from "./add-task-inline";
import { TaskCheckbox } from "./task-checkbox";

export function TaskList({
  tasks,
  day,
}: {
  tasks: TaskListItem[];
  day: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticTasks, patchTask] = useOptimistic(
    tasks,
    (current: TaskListItem[], next: { id: string; status: TaskStatus }) =>
      current.map((task) =>
        task.id === next.id ? { ...task, status: next.status } : task,
      ),
  );

  function toggle(task: TaskListItem) {
    const status: TaskStatus = task.status === "done" ? "todo" : "done";

    startTransition(async () => {
      patchTask({ id: task.id, status });
      const result = await setTaskStatus({ id: task.id, status });
      // On failure React drops the optimistic value when the transition
      // settles, so the row reverts itself. We only have to explain why.
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
                <div className="min-w-0 flex-1">
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
                  {task.projects?.name ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      from:{" "}
                      <span className="underline underline-offset-2">
                        {task.projects.name}
                      </span>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddTaskInline day={day} onError={setError} />

      {error ? (
        <p role="alert" className="pt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
