"use client";

import { useOptimistic, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { deleteTransaction } from "../actions";
import {
  formatMoney,
  PASTEL_BAR,
  type Category,
  type TransactionListItem,
} from "../schema";

export function TransactionList({
  transactions,
  categories,
  currency,
}: {
  transactions: TransactionListItem[];
  categories: Category[];
  currency: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const byId = new Map(categories.map((category) => [category.id, category]));

  const [rows, removeRow] = useOptimistic(
    transactions,
    (current: TransactionListItem[], id: string) =>
      current.filter((row) => row.id !== id),
  );

  function remove(id: string) {
    startTransition(async () => {
      removeRow(id);
      const result = await deleteTransaction({ id });
      // React drops the optimistic edit when the transition settles, so a
      // failed delete puts the row back on its own.
      setError(result.ok ? null : result.error);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        Nothing recorded this month yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col">
        {rows.map((row) => {
          const category = row.category_id ? byId.get(row.category_id) : null;
          const income = row.kind === "income";

          return (
            <li
              key={row.id}
              className="group flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0"
            >
              {/* Colour is a data channel only: the dot ties the row back to
                  its slice of the chart, the row itself stays neutral. */}
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  category ? PASTEL_BAR[category.color] : "bg-muted-foreground/30",
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {row.note || category?.name || (income ? "Income" : "Expense")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {category?.name ?? "Uncategorised"} · {row.occurred_on}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  income ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {income ? "+" : "−"}
                {formatMoney(row.amount_cents, currency)}
              </span>

              <button
                type="button"
                onClick={() => remove(row.id)}
                aria-label={`Delete ${row.note || "entry"}`}
                className="t-press shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="pt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
