"use server";

import { requireUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  createTransactionSchema,
  deleteTransactionSchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type CreateTransactionInput,
} from "./schema";

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That entry isn't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      kind: parsed.data.kind,
      amount_cents: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      category_id: parsed.data.categoryId ?? null,
      note: parsed.data.note,
    })
    .select("id")
    .single();

  if (error) return fail(toUserMessage(error));

  invalidate(`transactions:${user.id}`);
  return ok(data);
}

export async function deleteTransaction(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) return fail("That entry isn't valid.");

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  invalidate(`transactions:${user.id}`);
  return ok();
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That category isn't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  // 23505 here means the name is taken for that kind; the generic copy would
  // be confusing, so it gets its own line.
  if (error) {
    return fail(
      (error as { code?: string }).code === "23505"
        ? "You already have a category with that name."
        : toUserMessage(error),
    );
  }

  invalidate(`categories:${user.id}`);
  return ok(data);
}

export async function updateCategory(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return fail("That change isn't valid.");

  const { id, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) return ok();

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  invalidate(`categories:${user.id}`);
  // Archiving changes how the list renders its category chips.
  invalidate(`transactions:${user.id}`);
  return ok();
}
