import { tool } from "ai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  createCategory,
  createTransaction,
  setWalletBalance,
  updateTransaction,
} from "./actions";
import {
  createCategorySchema,
  createTransactionSchema,
  setWalletBalanceSchema,
  updateTransactionSchema,
  monthBounds,
  monthSchema,
  TRANSACTION_COLUMNS,
} from "./schema";

export function financeTools(userId: string) {
  return {
    createTransaction: tool({
      description:
        "Record income or an expense. amount is in major units ('12.50'), occurredOn is YYYY-MM-DD — default to the user's today. categoryId must be one of the category ids in context; omit it if nothing fits.",
      inputSchema: createTransactionSchema,
      execute: async (input) => {
        const result = await createTransaction(input);
        return result.ok
          ? { created: true, id: result.data.id }
          : { created: false, error: result.error };
      },
    }),

    updateTransaction: tool({
      description:
        "Change an existing entry. Every field is required — send the current value for anything the user did not ask to change. Entry ids come from monthlyMoneySummary.",
      inputSchema: updateTransactionSchema,
      execute: async (input) => {
        const result = await updateTransaction(input);
        return result.ok
          ? { updated: true }
          : { updated: false, error: result.error };
      },
    }),

    setWalletBalance: tool({
      description:
        "Set what the wallet actually holds right now, in major units. Use when the user states their balance ('I have 5000 left'); it adjusts the opening balance and never invents a transaction.",
      inputSchema: setWalletBalanceSchema,
      execute: async (input) => {
        const result = await setWalletBalance(input);
        return result.ok
          ? { updated: true }
          : { updated: false, error: result.error };
      },
    }),

    createCategory: tool({
      description:
        "Create a spending or income category. Only when no existing category fits — the current ones are in context.",
      inputSchema: createCategorySchema,
      execute: async (input) => {
        const result = await createCategory(input);
        return result.ok
          ? { created: true, id: result.data.id }
          : { created: false, error: result.error };
      },
    }),

    monthlyMoneySummary: tool({
      description:
        "Totals and every entry for one month (YYYY-MM). Use for questions like 'what did I spend last month' or 'how much did I earn in July'.",
      inputSchema: z.object({ month: monthSchema }),
      execute: async ({ month }) => {
        const { from, to } = monthBounds(month);
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("transactions")
          .select(TRANSACTION_COLUMNS)
          .eq("user_id", userId)
          .gte("occurred_on", from)
          .lt("occurred_on", to)
          .order("occurred_on", { ascending: false })
          .limit(500);

        if (error) return { error: "Could not read that month." };

        const rows = data ?? [];
        const total = (kind: string) =>
          rows
            .filter((row) => row.kind === kind)
            .reduce((sum, row) => sum + row.amount_cents, 0);

        return {
          month,
          // Minor units throughout, same as storage.
          incomeCents: total("income"),
          expenseCents: total("expense"),
          transactions: rows,
        };
      },
    }),
  };
}
