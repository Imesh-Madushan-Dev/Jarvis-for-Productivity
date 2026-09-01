import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_COLUMNS,
  TRANSACTION_COLUMNS,
  monthBounds,
  type Category,
  type TransactionListItem,
} from "./schema";

export async function listCategories(userId: string): Promise<Category[]> {
  "use cache: private";
  cacheTag(`categories:${userId}`);
  cacheLife({ stale: 300 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("user_id", userId)
    .order("kind")
    .order("name")
    .limit(200);

  if (error) throw error;
  return (data ?? []) as Category[];
}

/** One month, one query. The cap is a runaway guard, not a page size. */
export async function listTransactions(
  userId: string,
  month: string,
  limit = 500,
): Promise<TransactionListItem[]> {
  "use cache: private";
  cacheTag(`transactions:${userId}`);
  cacheLife({ stale: 60 });

  const { from, to } = monthBounds(month);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("user_id", userId)
    .gte("occurred_on", from)
    .lt("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Totals are folded in one pass over the rows we already fetched rather than
 * asking Postgres for a second aggregate query — the month is bounded, so the
 * rows are in memory anyway.
 */
export function summarize(transactions: TransactionListItem[]) {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();

  for (const item of transactions) {
    if (item.kind === "income") income += item.amount_cents;
    else expense += item.amount_cents;

    const key = item.category_id ?? "uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + item.amount_cents);
  }

  return { income, expense, net: income - expense, byCategory };
}
