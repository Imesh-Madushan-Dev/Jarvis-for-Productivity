"use server";

import { invalidate } from "@/lib/cache";

import { requireUser } from "@/lib/auth";
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
