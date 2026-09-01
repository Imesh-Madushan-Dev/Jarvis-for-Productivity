import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

export type MoneyKind = Database["public"]["Enums"]["money_kind"];

export const CATEGORY_COLUMNS = "id,name,kind,color,icon,archived" as const;
export const TRANSACTION_COLUMNS =
  "id,kind,amount_cents,occurred_on,note,category_id" as const;

export type Category = {
  id: string;
  name: string;
  kind: MoneyKind;
  /** #RRGGBB. Used as an inline style — Tailwind cannot build classes from data. */
  color: string;
  icon: string;
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
 * Every category gets its own accent, so a seven-key palette was never going
 * to be enough — the colour is a hex value chosen from this list (or typed by
 * hand) and painted inline. Chosen to stay legible as a dot or a bar on both
 * themes; text never sits on them.
 */
export const CATEGORY_PALETTE = [
  "#E06C75",
  "#E8875A",
  "#E3B341",
  "#7FB069",
  "#2F8F5B",
  "#3FA796",
  "#4C9BE8",
  "#6E7BF2",
  "#9C6ADE",
  "#D473C4",
  "#C2544D",
  "#B5836B",
  "#8B94A8",
  "#D9A441",
] as const;

/** Falls back rather than rendering a broken style if the value is odd. */
export function categoryColor(color: string | undefined) {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#8B94A8";
}

/**
 * The first palette colour nobody is using yet, so a new category never
 * arrives wearing an existing one. Falls back to rotating once all are taken.
 */
export function nextFreeColor(used: string[]) {
  const taken = new Set(used.map((value) => value.toUpperCase()));
  return (
    CATEGORY_PALETTE.find((colour) => !taken.has(colour)) ??
    CATEGORY_PALETTE[used.length % CATEGORY_PALETTE.length]
  );
}

export const moneyKind = z.enum(["income", "expense"]);
const hexColor = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^#[0-9A-F]{6}$/, "Pick a colour.");

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
 * A balance, unlike a transaction, may legitimately be zero or negative - so
 * it gets its own parser rather than loosening the amount one.
 */
/**
 * The tool-facing shapes carry the amount *unparsed*.
 *
 * The AI SDK validates a tool's input against its schema and hands the parsed
 * output to `execute`, which then calls the same action the form calls — and
 * the action parses again. With a transforming field that means the transform
 * runs twice, and "1000" is stored as 10,000,000 cents. Tools therefore
 * validate the shape but leave the amount as typed.
 */
const rawAmount = z.union([z.string().trim().min(1), z.number()]);

export const createTransactionToolSchema = createTransactionSchema.extend({
  amount: rawAmount,
});

export const updateTransactionToolSchema = updateTransactionSchema.extend({
  amount: rawAmount,
});

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

export const setWalletBalanceToolSchema = z.object({ balance: rawAmount });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name.").max(60),
  kind: moneyKind,
  /** Omitted means "pick one nobody is using" — see `nextFreeColor`. */
  color: hexColor.optional(),
  icon: z.string().trim().max(12).default(""),
});
export type CreateCategoryInput = z.input<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60).optional(),
  color: hexColor.optional(),
  icon: z.string().trim().max(12).optional(),
  archived: z.boolean().optional(),
});

/** YYYY-MM. Month is the only window the tracker ever queries. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export function formatMoney(cents: number, currency: string) {
  // Always two decimals. Dropping them on round numbers makes a large amount
  // and a hundredth of it look alike at a glance, which is the one mistake a
  // money column must not make.
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Month math on the YYYY-MM string itself. `occurred_on` is a DATE column, not
 * an instant, so none of this needs a timezone - the day the user typed is the
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

/**
 * Totals are folded in one pass over the rows we already fetched rather than
 * asking Postgres for a second aggregate query - the month is bounded, so the
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
