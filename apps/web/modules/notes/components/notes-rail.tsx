"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import type { NoteListItem } from "../schema";
import { NoteCard } from "./note-card";

type Tab = "recents" | "suggested";

export function NotesRail({ notes }: { notes: NoteListItem[] }) {
  const { value: tab, setValue: setTab } = useLocalStorage<Tab>(
    "moly.notes.tab",
    "recents",
  );

  // ponytail: "Suggested" is oldest-touched-first — notes worth revisiting.
  // An honest heuristic, not a ranking model. Swap when there's a real signal.
  const ordered = tab === "recents" ? notes : [...notes].reverse();

  return (
    <section
      aria-labelledby="notes-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="notes-heading" className="text-base font-medium">
          Notes
        </h2>
        <div role="tablist" aria-label="Note ordering" className="flex gap-1">
          {(["recents", "suggested"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "t-press rounded-md px-2 py-1 text-sm capitalize",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                tab === value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">
          No notes yet. Use New Note above and they will show up here.
        </p>
      ) : (
        <ul className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {ordered.map((note) => (
            <li key={note.id} className="w-62 shrink-0 snap-start">
              <NoteCard note={note} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
