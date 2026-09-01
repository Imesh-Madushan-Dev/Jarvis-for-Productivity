"use server";

import { requireUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  nextFreeColor,
  createTransactionSchema,
  deleteTransactionSchema,
  setWalletBalanceSchema,
  updateCategorySchema,
  updateTransactionSchema,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type SetWalletBalanceInput,
  type UpdateTransactionInput,
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

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That entry isn't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .update({
      kind: parsed.data.kind,
      amount_cents: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      category_id: parsed.data.categoryId ?? null,
      note: parsed.data.note,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  invalidate(`transactions:${user.id}`);
  return ok();
}

/**
 * Stores the difference, not the number typed: the opening balance is set so
 * that opening + everything recorded equals what the user says they have.
 */
export async function setWalletBalance(
  input: SetWalletBalanceInput,
): Promise<ActionResult> {
  const parsed = setWalletBalanceSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That balance isn't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data: net } = await supabase
    .from("wallet_net")
    .select("net_cents")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({
      opening_balance_cents: parsed.data.balance - (net?.net_cents ?? 0),
    })
    .eq("id", user.id);

  if (error) return fail(toUserMessage(error));

  invalidate(`profile:${user.id}`);
  invalidate(`transactions:${user.id}`);
  return ok();
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

  // Colour is chosen against what already exists, so two categories never
  // share an accent unless the user picks one deliberately.
  let color = parsed.data.color;
  if (!color) {
    const { data: existing } = await supabase
      .from("categories")
      .select("color")
      .eq("user_id", user.id)
      .limit(200);
    color = nextFreeColor((existing ?? []).map((row) => row.color));
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, user_id: user.id, color })
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
