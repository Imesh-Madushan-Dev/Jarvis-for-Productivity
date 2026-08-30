"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Note01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/modules/events/actions";
import { createNote } from "@/modules/notes/actions";
import { createTask } from "@/modules/tasks/actions";

type Kind = "task" | "note" | "event";

const COPY: Record<Kind, { label: string; icon: typeof Note01Icon; blurb: string }> =
  {
    task: {
      label: "New Task",
      icon: CheckmarkCircle02Icon,
      blurb: "Add something to today's plan.",
    },
    note: {
      label: "New Note",
      icon: Note01Icon,
      blurb: "Capture a thought before it escapes.",
    },
    event: {
      label: "New Event",
      icon: Calendar03Icon,
      blurb: "Block time on today's calendar.",
    },
  };

export function QuickCreateDialog({ kind, day }: { kind: Kind; day: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = COPY[kind];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const title = String(form.get("title") ?? "").trim();

      const result =
        kind === "task"
          ? await createTask({ title, plannedDate: day })
          : kind === "note"
            ? await createNote({
                title,
                body: String(form.get("body") ?? ""),
              })
            : await createEvent({
                title,
                startsAt: new Date(
                  String(form.get("startsAt") ?? ""),
                ).toISOString(),
                endsAt: new Date(
                  String(form.get("endsAt") ?? ""),
                ).toISOString(),
                allDay: false,
              });

      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="t-press gap-1.5">
            <HugeiconsIcon icon={copy.icon} className="size-4" />
            {copy.label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{copy.label}</DialogTitle>
            <DialogDescription>{copy.blurb}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <Input
              name="title"
              required
              autoFocus
              placeholder="Title"
              aria-label="Title"
            />

            {kind === "note" ? (
              <Textarea
                name="body"
                rows={5}
                placeholder="Write something…"
                aria-label="Note body"
              />
            ) : null}

            {kind === "event" ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Native pickers: correct on every platform, zero bundle. */}
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Starts
                  <Input name="startsAt" type="datetime-local" required />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Ends
                  <Input name="endsAt" type="datetime-local" required />
                </label>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="t-press">
              {pending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
