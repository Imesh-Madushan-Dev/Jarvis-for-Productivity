"use client";

import { useOptimistic, useState, useTransition } from "react";

import { createNote } from "../actions";
import type { CreateNoteInput, NoteListItem } from "../schema";
import { NewNoteDialog } from "./note-dialog";
import { NotesGrid } from "./notes-grid";

/**
 * Owns the optimistic note list, so a new note is on screen before the write
 * leaves the browser. React drops the optimistic value when the transition
 * settles: a rejected write removes the card by itself, and all this has to do
 * is say why.
 */
export function NotesBoard({ notes }: { notes: NoteListItem[] }) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [rows, add] = useOptimistic(
    notes,
    (current: NoteListItem[], note: NoteListItem) => [note, ...current],
  );

  function create(values: CreateNoteInput) {
    startTransition(async () => {
      add({
        // Only a React key until the server's row arrives.
        id: `pending-${crypto.randomUUID()}`,
        title: values.title ?? "",
        body: values.body ?? "",
        updated_at: new Date().toISOString(),
        project_id: null,
      });

      const result = await createNote(values);
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "note" : "notes"}
        </p>
        <NewNoteDialog onSubmit={create} />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <NotesGrid notes={rows} />
    </div>
  );
}
