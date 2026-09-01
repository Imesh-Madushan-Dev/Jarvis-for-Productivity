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
 * Wallet balance: what was there before the first entry, plus everything
 * recorded since. Summed by Postgres through the `wallet_net` view, so the
 * all-time figure costs one row rather than every transaction.
 */
export async function getWalletBalance(userId: string): Promise<number> {
  "use cache: private";
  cacheTag(`transactions:${userId}`);
  cacheTag(`profile:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const [{ data: profile }, { data: net }] = await Promise.all([
    supabase
      .from("profiles")
      .select("opening_balance_cents")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("wallet_net")
      .select("net_cents")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return (profile?.opening_balance_cents ?? 0) + (net?.net_cents ?? 0);
}
