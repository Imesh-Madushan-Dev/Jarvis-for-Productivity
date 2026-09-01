import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

export type MoneyKind = Database["public"]["Enums"]["money_kind"];

export const CATEGORY_COLUMNS = "id,name,kind,color,archived" as const;
export const TRANSACTION_COLUMNS =
  "id,kind,amount_cents,occurred_on,note,category_id" as const;

export type Category = {
  id: string;
  name: string;
  kind: MoneyKind;
  color: PastelColor;
  archived: boolean;
};

export type TransactionListItem = {
  id: string;
  kind: MoneyKind;
  amount_cents: number;
  occurred_on: string;
  note: string;
  category_id: string | null;
};

/**
 * Category colours. Chart-only by design: bars and legend dots. Cards, chips
 * and rows stay on the neutral surface tokens, so colour always means data.
 * The DB stores the key, so re-theming never needs a data migration; class
 * strings are literal so Tailwind can see them.
 */
export const PASTEL_BAR = {
  rose: "bg-rose-300 dark:bg-rose-400/70",
  peach: "bg-orange-300 dark:bg-orange-400/70",
  amber: "bg-amber-300 dark:bg-amber-400/70",
  mint: "bg-emerald-300 dark:bg-emerald-400/70",
  sky: "bg-sky-300 dark:bg-sky-400/70",
  lilac: "bg-violet-300 dark:bg-violet-400/70",
  sand: "bg-stone-300 dark:bg-stone-400/70",
} as const;

export type PastelColor = keyof typeof PASTEL_BAR;
export const PASTEL_COLORS = Object.keys(PASTEL_BAR) as PastelColor[];

export const moneyKind = z.enum(["income", "expense"]);
const pastel = z.enum(PASTEL_COLORS as [PastelColor, ...PastelColor[]]);

/**
 * Amounts arrive as a decimal string or number ("12.50") and are stored as
 * integer minor units. Rounding happens once, here, so no other layer is ever
 * tempted to do float arithmetic on money.
 */
export const amountToCents = z
  .union([z.string().trim().min(1), z.number()])
  .transform((value, ctx) => {
    const parsed = typeof value === "number" ? value : Number(value.replace(/[, ]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount greater than zero." });
      return z.NEVER;
    }
    const cents = Math.round(parsed * 100);
    if (cents > 1_000_000_000_00) {
      ctx.addIssue({ code: "custom", message: "That amount is too large." });
      return z.NEVER;
    }
    return cents;
  });

export const createTransactionSchema = z.object({
  kind: moneyKind,
  amount: amountToCents,
  occurredOn: z.iso.date(),
  categoryId: z.uuid().nullish(),
  note: z.string().trim().max(300).default(""),
});
export type CreateTransactionInput = z.input<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  id: z.uuid(),
  kind: moneyKind,
  amount: amountToCents,
  occurredOn: z.iso.date(),
  categoryId: z.uuid().nullish(),
  note: z.string().trim().max(300).default(""),
});
export type UpdateTransactionInput = z.input<typeof updateTransactionSchema>;

export const deleteTransactionSchema = z.object({ id: z.uuid() });

/**
 * A balance, unlike a transaction, may legitimately be zero or negative — so
 * it gets its own parser rather than loosening the amount one.
 */
export const setWalletBalanceSchema = z.object({
  balance: z.union([z.string().trim().min(1), z.number()]).transform((value, ctx) => {
    const parsed =
      typeof value === "number" ? value : Number(value.replace(/[, ]/g, ""));
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: "Enter a number." });
      return z.NEVER;
    }
    return Math.round(parsed * 100);
  }),
});
export type SetWalletBalanceInput = z.input<typeof setWalletBalanceSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name.").max(60),
  kind: moneyKind,
  color: pastel.default("mint"),
});
export type CreateCategoryInput = z.input<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60).optional(),
  color: pastel.optional(),
  archived: z.boolean().optional(),
});

/** YYYY-MM. Month is the only window the tracker ever queries. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Month math on the YYYY-MM string itself. `occurred_on` is a DATE column, not
 * an instant, so none of this needs a timezone — the day the user typed is the
 * day that is stored.
 */
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function monthBounds(month: string) {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

export function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
