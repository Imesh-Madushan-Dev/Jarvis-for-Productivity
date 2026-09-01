"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import {
  categoryColor,
  formatMoney,
  type Category,
  type CreateTransactionInput,
  type TransactionListItem,
} from "../schema";
import { EditTransactionDialog } from "./transaction-dialog";

/** Rows and writes both come from the board, which owns the optimistic list. */
export function TransactionList({
  transactions: rows,
  categories,
  currency,
  today,
  onEdit,
  onDelete,
}: {
  transactions: TransactionListItem[];
  categories: Category[];
  currency: string;
  today: string;
  onEdit: (id: string, values: CreateTransactionInput) => Promise<string | null>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<TransactionListItem | null>(null);

  const byId = new Map(categories.map((category) => [category.id, category]));

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
              className="group flex items-center gap-2.5 border-b border-border/60 py-2 last:border-b-0"
            >
              {/* The category's own accent, tinted for the tile so text never
                  sits on a saturated colour. */}
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full text-base"
                style={{
                  backgroundColor: `${categoryColor(category?.color)}22`,
                  color: categoryColor(category?.color),
                }}
              >
                {category?.icon || "•"}
              </span>

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
                  income
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {income ? "+" : "−"}
                {formatMoney(row.amount_cents, currency)}
              </span>

              {/* Reserved width, so revealing the actions never reflows the
                  amounts column. */}
              <div className="flex w-14 shrink-0 justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setEditing(row)}
                  aria-label={`Edit ${row.note || "entry"}`}
                  className="t-press rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row.id)}
                  aria-label={`Delete ${row.note || "entry"}`}
                  className="t-press rounded-md p-1 text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <EditTransactionDialog
        entry={editing}
        categories={categories}
        today={today}
        onSubmit={onEdit}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
