import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  categoryColor,
  formatMoney,
  summarize,
  type Category,
  type TransactionListItem,
} from "../schema";

/**
 * The month in one card: what came in, what went out, and the three things
 * that took the most. Deliberately read-only — writing money happens on the
 * Money page, where the optimistic board lives.
 */
export function MoneySnapshot({
  transactions,
  categories,
  balance,
  currency,
}: {
  transactions: TransactionListItem[];
  categories: Category[];
  balance: number;
  currency: string;
}) {
  const { income, expense, byCategory } = summarize(transactions);
  const byId = new Map(categories.map((category) => [category.id, category]));

  const top = [...byCategory.entries()]
    .map(([id, total]) => ({ category: byId.get(id), total }))
    .filter((row) => row.category?.kind === "expense")
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const max = top[0]?.total ?? 0;

  return (
    <section
      aria-labelledby="money-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="money-heading" className="text-base font-medium">
          Money
        </h2>
        <Link
          href="/finance"
          className="t-press text-xs text-muted-foreground hover:text-foreground"
        >
          Open
        </Link>
      </div>

      <p
        className={cn(
          "mt-3 text-2xl font-semibold tracking-tight tabular-nums",
          balance < 0 && "text-rose-600 dark:text-rose-400",
        )}
      >
        {balance < 0 ? "−" : ""}
        {formatMoney(Math.abs(balance), currency)}
      </p>
      <p className="text-xs text-muted-foreground">in the wallet</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">In this month</dt>
          <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatMoney(income, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Out</dt>
          <dd className="tabular-nums text-rose-600 dark:text-rose-400">
            −{formatMoney(expense, currency)}
          </dd>
        </div>
      </dl>

      {top.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {top.map(({ category, total }) => (
            <li key={category!.id} className="flex items-center gap-2 text-xs">
              <span aria-hidden="true">{category!.icon || "•"}</span>
              <span className="w-20 shrink-0 truncate">{category!.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${max ? (total / max) * 100 : 0}%`,
                    backgroundColor: categoryColor(category!.color),
                  }}
                />
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(total, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Nothing recorded this month yet.
        </p>
      )}
    </section>
  );
}
