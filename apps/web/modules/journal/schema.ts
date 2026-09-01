import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

export type JournalSource = Database["public"]["Enums"]["journal_source"];

/** Never `embedding`: 768 floats per row is the one column you must not fetch. */
export const JOURNAL_COLUMNS =
  "id,day,source,body,transcript,audio_path,duration_seconds,created_at" as const;

export type JournalEntry = {
  id: string;
  day: string;
  source: JournalSource;
  body: string;
  transcript: string;
  audio_path: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export type JournalHit = {
  id: string;
  day: string;
  source: JournalSource;
  body: string;
  transcript: string;
  created_at: string;
  score: number;
};

export const createJournalEntrySchema = z.object({
  day: z.iso.date(),
  body: z.string().trim().max(20_000).default(""),
  source: z.enum(["text", "voice"]).default("text"),
  transcript: z.string().trim().max(20_000).default(""),
  audioPath: z.string().max(400).nullish(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 4).nullish(),
});
export type CreateJournalEntryInput = z.input<typeof createJournalEntrySchema>;

export const updateJournalEntrySchema = z.object({
  id: z.uuid(),
  body: z.string().trim().max(20_000),
});

export const deleteJournalEntrySchema = z.object({ id: z.uuid() });

export const searchJournalSchema = z.object({
  query: z.string().trim().min(1).max(300),
  from: z.iso.date().nullish(),
  to: z.iso.date().nullish(),
  limit: z.number().int().min(1).max(25).default(8),
});

/** What a reader (or a model) should see for an entry, whatever its source. */
export function entryText(entry: {
  body: string;
  transcript: string;
}): string {
  return entry.body.trim() || entry.transcript.trim();
}

export function entryPreview(
  entry: { body: string; transcript: string },
  length = 240,
): string {
  const text = entryText(entry);
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}
