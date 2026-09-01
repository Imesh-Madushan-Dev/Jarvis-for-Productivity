"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  Mic01Icon,
  Search01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { anchor } from "@/lib/day";
import { cn } from "@/lib/utils";
import {
  createJournalEntry,
  deleteJournalEntry,
  searchJournal,
} from "../actions";
import type { RecallHit } from "@/lib/ai/recall";
import { entryText, type JournalEntry } from "../schema";
import { VoiceRecorder, type VoiceResult } from "./voice-recorder";

type Patch =
  | { type: "add"; entry: JournalEntry }
  | { type: "remove"; id: string };

function apply(entries: JournalEntry[], patch: Patch) {
  return patch.type === "add"
    ? [patch.entry, ...entries]
    : entries.filter((entry) => entry.id !== patch.id);
}

function dayLabel(day: string, today: string) {
  if (day === today) return "Today";
  return anchor(day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function groupByDay(entries: JournalEntry[]) {
  const groups = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.day);
    if (bucket) bucket.push(entry);
    else groups.set(entry.day, [entry]);
  }
  return [...groups.entries()];
}

export function JournalBoard({
  entries,
  today,
}: {
  entries: JournalEntry[];
  today: string;
}) {
  const [draft, setDraft] = useState("");
  const [voice, setVoice] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RecallHit[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [, startWrite] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [rows, patch] = useOptimistic(entries, apply);

  function save() {
    const text = draft.trim();
    if (!text) return;

    const captured = voice;
    setDraft("");
    setVoice(null);
    setError(null);

    startWrite(async () => {
      patch({
        type: "add",
        entry: {
          // Only a React key until the server's row arrives.
          id: `pending-${crypto.randomUUID()}`,
          day: today,
          source: captured ? "voice" : "text",
          body: captured ? "" : text,
          transcript: captured ? text : "",
          audio_path: captured?.path ?? null,
          duration_seconds: captured?.durationSeconds ?? null,
          created_at: new Date().toISOString(),
        },
      });

      const result = await createJournalEntry({
        day: today,
        source: captured ? "voice" : "text",
        body: captured ? "" : text,
        transcript: captured ? text : "",
        audioPath: captured?.path ?? null,
        durationSeconds: captured?.durationSeconds ?? null,
      });

      if (!result.ok) {
        setError(result.error);
        setDraft(text);
      }
    });
  }

  function remove(id: string) {
    startWrite(async () => {
      patch({ type: "remove", id });
      const result = await deleteJournalEntry({ id });
      setError(result.ok ? null : result.error);
    });
  }

  function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setHits(null);
      return;
    }
    startSearch(async () => setHits(await searchJournal({ query: value })));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Composer. Cmd/Ctrl+Enter saves — the only shortcut worth having in a
          box you type paragraphs into. */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
          rows={4}
          placeholder="How did today go?"
          aria-label="Journal entry"
          className="resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />

        {voice ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Mic01Icon} className="size-3.5" />
            Transcribed from a {voice.durationSeconds}s recording — edit it
            before saving if it got a word wrong.
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <VoiceRecorder
            onError={setError}
            onResult={(result) => {
              setVoice(result);
              setDraft((current) =>
                current ? `${current}\n\n${result.text}` : result.text,
              );
              inputRef.current?.focus();
            }}
          />

          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!draft.trim()}
            className="t-press gap-1.5"
          >
            <HugeiconsIcon icon={SentIcon} className="size-4" />
            Save entry
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </section>

      <form onSubmit={runSearch} className="flex gap-2">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!event.target.value.trim()) setHits(null);
            }}
            placeholder="Search your journal…"
            aria-label="Search the journal"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={searching} className="t-press">
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      {hits ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground">
              {hits.length === 0
                ? "Nothing matched."
                : `${hits.length} ${hits.length === 1 ? "match" : "matches"}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setHits(null);
                setQuery("");
              }}
              className="t-press text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          {hits.map((hit) => (
            <article
              key={hit.id}
              className="t-lift rounded-xl border border-border bg-card p-4"
            >
              <p className="text-xs text-muted-foreground">
                {hit.day ? dayLabel(hit.day, today) : "Undated"}
              </p>
              <p className="mt-1.5 text-sm whitespace-pre-wrap">
                {hit.snippet}
              </p>
            </article>
          ))}
        </section>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Write a line about today, or record one.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groupByDay(rows).map(([day, dayEntries]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {dayLabel(day, today)}
              </h2>

              {dayEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="group t-lift rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap">
                      {entryText(entry)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      aria-label="Delete this entry"
                      className={cn(
                        "t-press shrink-0 rounded-md p-1 text-muted-foreground opacity-0",
                        "hover:text-destructive group-focus-within:opacity-100 group-hover:opacity-100",
                      )}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </button>
                  </div>

                  {entry.source === "voice" ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <HugeiconsIcon icon={Mic01Icon} className="size-3.5" />
                      Voice note
                      {entry.duration_seconds
                        ? ` · ${entry.duration_seconds}s`
                        : ""}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
