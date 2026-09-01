import { tool } from "ai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { recall } from "@/lib/ai/recall";
import { createJournalEntry } from "./actions";
import {
  createJournalEntrySchema,
  entryPreview,
  JOURNAL_COLUMNS,
  recallSchema,
} from "./schema";

/**
 * The journal is the assistant's memory of what actually happened, so these
 * are read-first tools. Snippets are trimmed before they reach the model:
 * pulling whole entries into context costs money and buries the answer.
 */
export function journalTools(userId: string) {
  return {
    recall: tool({
      description:
        "Search everything the user has written — journal entries, notes, tasks and events — by meaning and by wording at once, newest first among equals. Use this whenever they refer to something from their own life ('that thing I mentioned', a person, a plan, a feeling) before saying you don't know. Narrow with sources or a from/to date range only when the question genuinely calls for it.",
      inputSchema: recallSchema,
      execute: async (input) => {
        const hits = await recall(input);
        // Snippets arrive pre-trimmed from Postgres; nothing is re-cut here.
        return {
          matches: hits.map((hit) => ({
            source: hit.source,
            day: hit.day,
            title: hit.title || undefined,
            text: hit.snippet,
          })),
        };
      },
    }),

    readJournal: tool({
      description:
        "Read journal entries for a date range in order — for 'what did I do last week' or summarising a month. Prefer recall when looking for a topic rather than a period.",
      inputSchema: z.object({
        from: z.iso.date(),
        to: z.iso.date(),
      }),
      execute: async ({ from, to }) => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("journal_entries")
          .select(JOURNAL_COLUMNS)
          .eq("user_id", userId)
          .gte("day", from)
          .lte("day", to)
          .order("day", { ascending: true })
          .limit(60);

        if (error) return { error: "Could not read the journal." };

        return {
          entries: (data ?? []).map((entry) => ({
            id: entry.id,
            day: entry.day,
            source: entry.source,
            text: entryPreview(entry, 600),
          })),
        };
      },
    }),

    addJournalEntry: tool({
      description:
        "Write something to the journal on the user's behalf, when they say to note or record it. Use their today from context unless they name a day.",
      inputSchema: createJournalEntrySchema.pick({ day: true, body: true }),
      execute: async (input) => {
        const result = await createJournalEntry({
          ...input,
          source: "text",
          transcript: "",
        });
        return result.ok
          ? { created: true, id: result.data.id }
          : { created: false, error: result.error };
      },
    }),
  };
}
