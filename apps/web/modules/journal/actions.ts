"use server";

import { requireUser } from "@/lib/auth";
import { embedText } from "@/lib/ai/embeddings";
import { invalidate } from "@/lib/cache";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import {
  createJournalEntrySchema,
  deleteJournalEntrySchema,
  entryText,
  updateJournalEntrySchema,
  type CreateJournalEntryInput,
  type JournalHit,
} from "./schema";

/**
 * Writes the entry, then embeds it.
 *
 * In that order and never the reverse: an embedding provider that is slow,
 * rate-limited or missing must not be able to lose someone's journal. An
 * unembedded row is still found by full-text search, and `backfillEmbeddings`
 * picks it up later.
 */
export async function createJournalEntry(
  input: CreateJournalEntryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createJournalEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That entry isn't valid.");
  }

  const text = entryText(parsed.data);
  if (!text) return fail("Write something first.");

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      day: parsed.data.day,
      source: parsed.data.source,
      body: parsed.data.body,
      transcript: parsed.data.transcript,
      audio_path: parsed.data.audioPath ?? null,
      duration_seconds: parsed.data.durationSeconds ?? null,
    })
    .select("id")
    .single();

  if (error) return fail(toUserMessage(error));

  const embedding = await embedText(text);
  if (embedding) {
    await supabase
      .from("journal_entries")
      .update({
        embedding: embedding.vector,
        embedding_model: embedding.model,
      })
      .eq("id", data.id)
      .eq("user_id", user.id);
  }

  invalidate(`journal:${user.id}`);
  return ok(data);
}

export async function updateJournalEntry(input: {
  id: string;
  body: string;
}): Promise<ActionResult> {
  const parsed = updateJournalEntrySchema.safeParse(input);
  if (!parsed.success) return fail("That entry isn't valid.");

  const user = await requireUser();
  const supabase = await createClient();

  // The text changed, so the old vector is wrong. Clear it first, then
  // replace it — a crash in between leaves the row searchable by text, which
  // is the safe failure.
  const { error } = await supabase
    .from("journal_entries")
    .update({ body: parsed.data.body, embedding: null, embedding_model: null })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  const embedding = await embedText(parsed.data.body);
  if (embedding) {
    await supabase
      .from("journal_entries")
      .update({
        embedding: embedding.vector,
        embedding_model: embedding.model,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);
  }

  invalidate(`journal:${user.id}`);
  return ok();
}

export async function deleteJournalEntry(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = deleteJournalEntrySchema.safeParse(input);
  if (!parsed.success) return fail("That entry isn't valid.");

  const user = await requireUser();
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("audio_path")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  // Storage has no foreign keys, so the audio is removed by hand. A failure
  // here leaves an orphaned file, never a broken row.
  if (entry?.audio_path) {
    await supabase.storage.from("journal-audio").remove([entry.audio_path]);
  }

  invalidate(`journal:${user.id}`);
  return ok();
}

/**
 * Hybrid search: full text and vector, fused in Postgres (see the
 * `search_journal` function). The query is embedded here; when there is no
 * embedding provider it degrades to plain full-text rather than failing.
 */
export async function searchJournal(input: {
  query: string;
  from?: string | null;
  to?: string | null;
  limit?: number;
}): Promise<JournalHit[]> {
  const query = input.query?.trim();
  if (!query) return [];

  await requireUser();
  const supabase = await createClient();
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("search_journal", {
    p_query: query,
    p_embedding: embedding?.vector ?? null,
    p_model: embedding?.model ?? null,
    p_limit: input.limit ?? 8,
    p_from: input.from ?? null,
    p_to: input.to ?? null,
  });

  if (error) {
    console.error("[journal] search failed", error);
    return [];
  }

  return (data ?? []) as JournalHit[];
}

/**
 * Embeds whatever was written while no provider key was set, or after a model
 * change. Batched, and capped so one call can never run away.
 */
export async function backfillEmbeddings(): Promise<
  ActionResult<{ embedded: number }>
> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("journal_entries")
    .select("id,body,transcript")
    .eq("user_id", user.id)
    .is("embedding", null)
    .limit(50);

  if (!rows?.length) return ok({ embedded: 0 });

  const { embedBatch } = await import("@/lib/ai/embeddings");
  const result = await embedBatch(rows.map((row) => entryText(row)));
  if (!result) return fail("No embedding provider is configured.");

  await Promise.all(
    rows.map((row, index) =>
      supabase
        .from("journal_entries")
        .update({
          embedding: result.vectors[index],
          embedding_model: result.model,
        })
        .eq("id", row.id)
        .eq("user_id", user.id),
    ),
  );

  return ok({ embedded: rows.length });
}
