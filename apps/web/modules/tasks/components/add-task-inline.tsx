"use client";

import { useState, useTransition } from "react";

import { createTask } from "../actions";

export function AddTaskInline({
  day,
  onError,
}: {
  day: string;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;

    setTitle("");
    onError(null);

    startTransition(async () => {
      const result = await createTask({ title: value, plannedDate: day });
      if (!result.ok) {
        onError(result.error);
        setTitle(value);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-3 pt-3">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 rounded-full border border-dashed border-muted-foreground/40"
      />
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add task"
        disabled={pending}
        aria-label="Add a task"
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
      />
    </form>
  );
}
