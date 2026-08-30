import type { NoteListItem } from "../schema";
import { NoteCard } from "./note-card";

export function NotesGrid({ notes }: { notes: NoteListItem[] }) {
  if (notes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No notes yet. Create one from the Overview header.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteCard note={note} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
