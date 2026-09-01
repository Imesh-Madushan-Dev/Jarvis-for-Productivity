import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mic01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";

import { anchor } from "@/lib/day";
import { entryPreview, type JournalEntry } from "../schema";

/**
 * Either "here's what you last wrote" or an invitation to write.
 *
 * Nothing is editable here on purpose: the journal composer owns recording,
 * transcription and the optimistic list, and half of it in a side card would
 * be a worse version of the page it links to.
 */
export function JournalSnapshot({
  entry,
  today,
}: {
  entry: JournalEntry | null;
  today: string;
}) {
  const written = entry?.day === today;

  return (
    <section
      aria-labelledby="journal-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="journal-heading" className="text-base font-medium">
          Journal
        </h2>
        <Link
          href="/journal"
          className="t-press text-xs text-muted-foreground hover:text-foreground"
        >
          {written ? "Open" : "Write"}
        </Link>
      </div>

      {entry ? (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {written
              ? "Today"
              : anchor(entry.day).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
            {entry.source === "voice" ? " · voice note" : ""}
          </p>
          <p className="mt-1.5 line-clamp-4 text-sm text-foreground/90">
            {entryPreview(entry, 220)}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing written yet. A line a day is enough for Moly to remember what
          happened.
        </p>
      )}

      {!written ? (
        <Link
          href="/journal"
          className="t-press mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
        >
          <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
          Write today&apos;s entry
          <span className="text-muted-foreground">or</span>
          <HugeiconsIcon icon={Mic01Icon} className="size-3.5" />
          record it
        </Link>
      ) : null}
    </section>
  );
}
