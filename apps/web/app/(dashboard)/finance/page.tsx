import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
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
