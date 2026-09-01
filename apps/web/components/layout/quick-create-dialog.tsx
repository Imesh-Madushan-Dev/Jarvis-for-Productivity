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

/**
 * Used from page headers, where there is no local list to patch — so instead
 * of an optimistic row, the dialog closes the instant you submit and the write
 * runs behind it. A rejected write reopens the dialog with what you typed and
 * the reason, which is the only honest way to close early.
 */
export function QuickCreateDialog({ kind, day }: { kind: Kind; day: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What was typed, kept so a rejected write can hand it straight back.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const copy = COPY[kind];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setOpen(false);
    setDraft(
      Object.fromEntries(
        Array.from(form.entries(), ([key, value]) => [key, String(value)]),
      ),
    );

    startTransition(async () => {
      const title = String(form.get("title") ?? "").trim();

      const remindAt = String(form.get("remindAt") ?? "").trim();

      const result =
        kind === "task"
          ? await createTask({
              title,
              plannedDate: day,
              // datetime-local has no offset; the browser's own zone is the
              // right one here because the user is typing a wall clock time.
              remindAt: remindAt ? new Date(remindAt).toISOString() : null,
            })
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

      if (result.ok) {
        // Nothing to hand back; the next open starts empty.
        setDraft({});
      } else {
        setError(result.error);
        setOpen(true);
      }
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
              defaultValue={draft.title ?? ""}
            />

            {kind === "task" ? (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Remind me (optional)
                <Input
                  name="remindAt"
                  type="datetime-local"
                  defaultValue={draft.remindAt ?? ""}
                />
              </label>
            ) : null}

            {kind === "note" ? (
              <Textarea
                name="body"
                rows={5}
                placeholder="Write something…"
                aria-label="Note body"
                defaultValue={draft.body ?? ""}
              />
            ) : null}

            {kind === "event" ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Native pickers: correct on every platform, zero bundle. */}
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Starts
                  <Input
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={draft.startsAt ?? ""}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Ends
                  <Input
                    name="endsAt"
                    type="datetime-local"
                    required
                    defaultValue={draft.endsAt ?? ""}
                  />
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
            <Button type="submit" className="t-press">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
