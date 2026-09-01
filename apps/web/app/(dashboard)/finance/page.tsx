import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { todayInZone } from "@/lib/day";
import { cn } from "@/lib/utils";
import { BalanceCard } from "@/modules/finance/components/balance-card";
import { CategoryManager } from "@/modules/finance/components/category-manager";
import { AddTransactionDialog } from "@/modules/finance/components/transaction-dialog";
import { TransactionList } from "@/modules/finance/components/transaction-list";
import {
  getWalletBalance,
  listCategories,
  listTransactions,
  summarize,
} from "@/modules/finance/queries";
import {
  formatMoney,
  formatMonthLabel,
  monthSchema,
  PASTEL_BAR,
  shiftMonth,
  type Category,
} from "@/modules/finance/schema";
import { getProfile } from "@/modules/profile/queries";

export const metadata = { title: "Money" };

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
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
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
  const rows = categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({
      category,
      total: byCategory.get(category.id) ?? 0,
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Spending by category shows up here once you record an expense.
      </p>
    );
  }

  // Bars are relative to the biggest category, not to the total — small
  // categories stay readable instead of collapsing into a hairline.
  const max = rows[0].total;

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ category, total }) => (
        <li key={category.id} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", PASTEL_BAR[category.color])}
          />
          <span className="w-24 shrink-0 truncate text-sm">{category.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", PASTEL_BAR[category.color])}
              style={{ width: `${(total / max) * 100}%` }}
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

function MonthNav({ month }: { month: string }) {
  return (
    <div className="flex items-center gap-1">
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
  );
}

async function FinanceBody({ month }: { month?: string }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  // "This month" is resolved from the profile's timezone, not the server's
  // clock, and only inside this request-time scope.
  const active = month ?? todayInZone(profile.timezone).slice(0, 7);
  const [categories, transactions, balance] = await Promise.all([
    listCategories(user.id),
    listTransactions(user.id, active),
    getWalletBalance(user.id),
  ]);
  const { income, expense, byCategory } = summarize(transactions);
  const currency = profile.currency;

  return (
    <div className="flex flex-col gap-5">
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
        <BalanceCard balance={balance} currency={currency} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4 pb-2">
            <h2 className="text-base font-medium">
              {formatMonthLabel(active)}
            </h2>
            <MonthNav month={active} />
          </div>
          <TransactionList
            transactions={transactions}
            categories={categories}
            currency={currency}
            today={todayInZone(profile.timezone)}
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

async function MoneyActions() {
  const user = await requireUser();
  const [profile, categories] = await Promise.all([
    getProfile(user.id),
    listCategories(user.id),
  ]);

  return (
    <>
      <CategoryManager categories={categories} />
      <AddTransactionDialog
        categories={categories}
        today={todayInZone(profile.timezone)}
      />
    </>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  // The month lives in the URL so the server knows the query window before it
  // renders — and a month is bookmarkable.
  const active = monthSchema.safeParse(month).success ? month : undefined;

  return (
    <PageShell
      title="Money"
      description="Income and expenses, one month at a time."
      actions={
        <Suspense fallback={<Skeleton className="h-8 w-48 rounded-md" />}>
          <MoneyActions />
        </Suspense>
      }
    >
      {/* No `key`: reusing the boundary keeps the current month on screen
          while the next one loads, instead of flashing a full-page skeleton
          on every arrow click. */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <FinanceBody month={active} />
      </Suspense>
    </PageShell>
  );
}
