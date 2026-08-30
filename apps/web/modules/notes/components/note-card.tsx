"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notebook01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type { NoteListItem } from "../schema";

export function NoteCard({
  note,
  className,
}: {
  note: NoteListItem;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "t-lift rounded-xl border border-border bg-background p-4 hover:border-muted-foreground/40",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Notebook01Icon} className="size-3.5" />
          Notebook
        </span>
        <span suppressHydrationWarning>
          {formatDistanceToNowStrict(new Date(note.updated_at))} ago
        </span>
      </div>
      <h3 className="mt-3 truncate text-sm font-medium">
        {note.title || "Untitled"}
      </h3>
      <p className="mt-2 line-clamp-4 text-xs whitespace-pre-line text-muted-foreground">
        {note.body}
      </p>
    </article>
  );
}
