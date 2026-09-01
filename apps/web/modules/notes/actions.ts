"use server";

import { invalidate } from "@/lib/cache";

import { requireUser } from "@/lib/auth";
import { embedText } from "@/lib/ai/embeddings";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import {
  createNoteSchema,
  saveScratchPadSchema,
  type CreateNoteInput,
  type SaveScratchPadInput,
} from "./schema";

export async function createNote(
  input: CreateNoteInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) return fail("That note isn't valid.");

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      kind: "note",
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (error) return fail(toUserMessage(error));

  // Written first, embedded second: a slow or missing provider can never cost
  // someone their note. Until the vector lands the note is still found by
  // words, which is how tasks and events are found permanently.
  const embedding = await embedText(
    `${parsed.data.title}
${parsed.data.body}`,
  );
  if (embedding) {
    await supabase
      .from("notes")
      .update({ embedding: embedding.vector, embedding_model: embedding.model })
      .eq("id", data.id)
      .eq("user_id", user.id);
  }

  invalidate(`notes:${user.id}`);
  return ok(data);
}

export async function saveScratchPad(
  input: SaveScratchPadInput,
): Promise<ActionResult> {
  const parsed = saveScratchPadSchema.safeParse(input);
  if (!parsed.success) return fail("That note is too long to save.");

  const user = await requireUser();
  const supabase = await createClient();

  // The one-scratchpad-per-user index is partial, so ON CONFLICT can't infer
  // it. Read the id first; this only runs on a debounced save.
  const { data: existing, error: readError } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "scratchpad")
    .maybeSingle();

  if (readError) return fail(toUserMessage(readError));

  const { error } = existing
    ? await supabase
        .from("notes")
        .update({ body: parsed.data.body })
        .eq("id", existing.id)
        .eq("user_id", user.id)
    : await supabase.from("notes").insert({
        user_id: user.id,
        kind: "scratchpad",
        title: "Scratch Pad",
        body: parsed.data.body,
      });

  if (error) return fail(toUserMessage(error));

  invalidate(`scratchpad:${user.id}`);
  return ok();
}

/**
 * Embeds notes written before a provider key existed, or after a model change.
 * Batched and capped; the journal has the same job for its own rows.
 */
export async function backfillNoteEmbeddings(): Promise<
  ActionResult<{ embedded: number }>
> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("notes")
    .select("id,title,body")
    .eq("user_id", user.id)
    .eq("kind", "note")
    .is("embedding", null)
    .limit(50);

  if (!rows?.length) return ok({ embedded: 0 });

  const { embedBatch } = await import("@/lib/ai/embeddings");
  const result = await embedBatch(
    rows.map((row) => `${row.title}
${row.body}`),
  );
  if (!result) return fail("No embedding provider is configured.");

  await Promise.all(
    rows.map((row, index) =>
      supabase
        .from("notes")
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
