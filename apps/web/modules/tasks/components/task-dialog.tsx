"use client";


import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/form/date-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toLocalInput } from "@/lib/day";
import { Textarea } from "@/components/ui/textarea";
import type { TaskListItem } from "../schema";

export type TaskEdit = { title: string; body: string; remindAt: string | null };

/**
 * The dialog collects; the list writes. It closes on submit rather than on the
 * server's answer, because the list has already patched the row.
 *
 * `task` doubles as the open state: the list sets it to open, null to close.
 */
export function EditTaskDialog({
  task,
  onClose,
  onSubmit,
  onDelete,
}: {
  task: TaskListItem | null;
  onClose: () => void;
  onSubmit: (values: TaskEdit) => void;
  onDelete: () => void;
}) {
  // A pending row has no server id yet, so there is nothing to update.
  const editable = task !== null && !task.id.startsWith("pending-");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const remindAt = String(form.get("remindAt") ?? "").trim();

    onSubmit({
      title: String(form.get("title") ?? "").trim(),
      body: String(form.get("body") ?? ""),
      remindAt: remindAt ? new Date(remindAt).toISOString() : null,
    });
    onClose();
  }

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {task ? (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
              <DialogDescription>
                {editable
                  ? "Change the title, add a description, or move the reminder."
                  : "Still saving — reopen this once it lands."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-4">
              <Input
                name="title"
                required
                autoFocus
                placeholder="Title"
                aria-label="Title"
                defaultValue={task.title}
              />
              <Textarea
                name="body"
                rows={5}
                placeholder="Add a description…"
                aria-label="Description"
                defaultValue={task.body}
              />
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                Remind me (optional)
                <DateTimeField
                  name="remindAt"
                  ariaLabel="Reminder"
                  defaultValue={toLocalInput(task.remind_at)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={!editable}
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="t-press text-destructive hover:text-destructive"
              >
                Delete
              </Button>
              <Button type="submit" disabled={!editable} className="t-press">
                Save
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
