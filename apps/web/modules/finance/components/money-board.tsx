"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../actions";
import {
  categoryColor,
  formatMoney,
  formatMonthLabel,
  shiftMonth,
  summarize,
  type Category,
  type CreateTransactionInput,
  type TransactionListItem,
} from "../schema";
import { BalanceCard } from "./balance-card";
import { CategoryManager } from "./category-manager";
import { AddTransactionDialog } from "./transaction-dialog";
import { TransactionList } from "./transaction-list";

type Patch =
  | { type: "add"; row: TransactionListItem }
  | { type: "update"; row: TransactionListItem }
  | { type: "remove"; id: string };

/** Signed effect of a row on the wallet balance. */
function signed(row: TransactionListItem) {
  return row.kind === "income" ? row.amount_cents : -row.amount_cents;
}

function apply(rows: TransactionListItem[], patch: Patch) {
  switch (patch.type) {
    case "add":
      return [patch.row, ...rows].sort((a, b) =>
        b.occurred_on.localeCompare(a.occurred_on),
      );
    case "update":
      return rows.map((row) => (row.id === patch.row.id ? patch.row : row));
    case "remove":
      return rows.filter((row) => row.id !== patch.id);
  }
}

/**
 * Everything the money page shows, driven by one optimistic list.
 *
 * The point is that a write costs zero round trips *visually*: the row, the
 * totals, the chart and the balance all move the moment you hit save, and the
 * server's answer only ever confirms them. React drops the optimistic value
 * when the transition settles, so a rejected write rolls the whole view back
 * on its own — the only thing left to do is say why.
 */
export function MoneyBoard({
  month,
  transactions,
  categories,
  currency,
  balance,
  today,
}: {
  month: string;
  transactions: TransactionListItem[];
  categories: Category[];
  currency: string;
  balance: number;
  today: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [rows, patch] = useOptimistic(transactions, apply);

  // The balance is all-time, so it moves by the delta of whatever is pending
  // rather than by re-summing the month.
  const pendingDelta =
    rows.reduce((sum, row) => sum + signed(row), 0) -
    transactions.reduce((sum, row) => sum + signed(row), 0);

  const { income, expense, byCategory } = summarize(rows);

  function add(values: CreateTransactionInput) {
    return new Promise<string | null>((resolve) => {
      startTransition(async () => {
        patch({
          type: "add",
          row: {
            // Replaced by the server's row on the next render; only ever used
            // as a React key while the write is in flight.
            id: `pending-${crypto.randomUUID()}`,
            kind: values.kind,
            amount_cents: Math.round(Number(values.amount) * 100) || 0,
            occurred_on: values.occurredOn,
            note: values.note ?? "",
            category_id: values.categoryId ?? null,
          },
        });

        const result = await createTransaction(values);
        setError(result.ok ? null : result.error);
        resolve(result.ok ? null : result.error);
      });
    });
  }

  function edit(id: string, values: CreateTransactionInput) {
    return new Promise<string | null>((resolve) => {
      startTransition(async () => {
        patch({
          type: "update",
          row: {
            id,
            kind: values.kind,
            amount_cents: Math.round(Number(values.amount) * 100) || 0,
            occurred_on: values.occurredOn,
            note: values.note ?? "",
            category_id: values.categoryId ?? null,
          },
        });

        const result = await updateTransaction({ id, ...values });
        setError(result.ok ? null : result.error);
        resolve(result.ok ? null : result.error);
      });
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      patch({ type: "remove", id });
      const result = await deleteTransaction({ id });
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h2 className="text-base font-medium">{formatMonthLabel(month)}</h2>
          {([-1, 1] as const).map((delta) => (
            <Button
              key={delta}
              variant="ghost"
              size="sm"
              className="t-press"
              render={
                <Link
                  href={`/finance?month=${shiftMonth(month, delta)}`}
                  aria-label={delta < 0 ? "Previous month" : "Next month"}
                >
                  {delta < 0 ? "←" : "→"}
                </Link>
              }
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <CategoryManager categories={categories} />
          <AddTransactionDialog today={today} categories={categories} onSubmit={add} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Income"
          tone="in"
          value={formatMoney(income, currency)}
          hint="This month"
        />
        <StatCard
          label="Spent"
          tone="out"
          value={formatMoney(expense, currency)}
          hint={
            income > 0
              ? `${Math.round((expense / income) * 100)}% of this month's income`
              : "This month"
          }
        />
        <BalanceCard balance={balance + pendingDelta} currency={currency} />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <TransactionList
            transactions={rows}
            categories={categories}
            currency={currency}
            today={today}
            onEdit={edit}
            onDelete={remove}
          />
        </section>

        <section className="h-fit rounded-2xl border border-border bg-card p-5">
          <h2 className="pb-4 text-base font-medium">Where it went</h2>
          <Breakdown
            categories={categories}
            byCategory={byCategory}
            currency={currency}
          />
        </section>
      </div>
    </div>
  );
}

/** Surfaces stay neutral; only the number carries the in/out colour. */
function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "in" | "out";
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
          tone === "in"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        {tone === "in" ? "+" : "−"}
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Breakdown({
  categories,
  byCategory,
  currency,
}: {
  categories: Category[];
  byCategory: Map<string, number>;
  currency: string;
}) {
  const items = categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({ category, total: byCategory.get(category.id) ?? 0 }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Spending by category shows up here once you record an expense.
      </p>
    );
  }

  // Bars are relative to the biggest category, not to the total — small
  // categories stay readable instead of collapsing into a hairline.
  const max = items[0].total;

  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ category, total }) => (
        <li key={category.id} className="flex items-center gap-3">
          <span aria-hidden="true" className="w-5 shrink-0 text-center text-sm">
            {category.icon || "•"}
          </span>
          <span className="w-24 shrink-0 truncate text-sm">{category.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: `${(total / max) * 100}%`,
                backgroundColor: categoryColor(category.color),
              }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {formatMoney(total, currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
