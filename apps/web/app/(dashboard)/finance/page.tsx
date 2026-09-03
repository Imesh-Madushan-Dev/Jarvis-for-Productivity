import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { CardsSkeleton, RowsSkeleton } from "@/components/layout/skeletons";
import { requireUser } from "@/lib/auth";
import { todayInZone } from "@/lib/day";
import { MoneyBoard } from "@/modules/finance/components/money-board";
import {
  getWalletBalance,
  listCategories,
  listTransactions,
} from "@/modules/finance/queries";
import { monthSchema } from "@/modules/finance/schema";
import { getProfile } from "@/modules/profile/queries";

export const metadata = { title: "Money" };

async function FinanceBody({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  // The month lives in the URL so the server knows the query window before it
  // renders - and a month is bookmarkable. Read inside the boundary: awaiting
  // it in the page body would make the whole route unprerenderable.
  const { month: raw } = await searchParams;
  const month = monthSchema.safeParse(raw).success ? raw : undefined;

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

  // Everything below here is one client component: it owns the optimistic
  // list, so a write moves the rows, the totals, the chart and the balance
  // without waiting for the server.
  return (
    <MoneyBoard
      month={active}
      transactions={transactions}
      categories={categories}
      currency={profile.currency}
      balance={balance}
      today={todayInZone(profile.timezone)}
    />
  );
}

export default function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <PageShell
      title="Money"
      description="Income and expenses, one month at a time."
    >
      {/* No `key`: reusing the boundary keeps the current month on screen
          while the next one loads, instead of flashing a full-page skeleton
          on every arrow click. */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-5">
            <CardsSkeleton />
            <div className="rounded-2xl border border-border bg-card p-5">
              <RowsSkeleton />
            </div>
          </div>
        }
      >
        <FinanceBody searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
