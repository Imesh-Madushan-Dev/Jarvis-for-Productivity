"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Note01Icon } from "@hugeicons/core-free-icons";

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
import type { CreateNoteInput } from "../schema";

/**
 * The dialog collects; the board writes. It closes on submit rather than on
 * the server's answer, because the board has already put the note on screen.
 */
export function NewNoteDialog({
  onSubmit,
}: {
  onSubmit: (values: CreateNoteInput) => void;
}) {
  const [open, setOpen] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onSubmit({
      title: String(form.get("title") ?? "").trim(),
      body: String(form.get("body") ?? ""),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="t-press gap-1.5">
            <HugeiconsIcon icon={Note01Icon} className="size-4" />
            New note
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        {open ? (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New note</DialogTitle>
              <DialogDescription>
                Capture a thought before it escapes.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-4">
              <Input name="title" autoFocus placeholder="Title" aria-label="Title" />
              <Textarea
                name="body"
                rows={6}
                placeholder="Write something…"
                aria-label="Note body"
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="t-press">
                Create
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
