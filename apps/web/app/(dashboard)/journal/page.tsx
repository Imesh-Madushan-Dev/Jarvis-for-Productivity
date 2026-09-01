import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { RowsSkeleton } from "@/components/layout/skeletons";
import { requireUser } from "@/lib/auth";
import { todayInZone } from "@/lib/day";
import { JournalBoard } from "@/modules/journal/components/journal-board";
import { listJournalEntries } from "@/modules/journal/queries";
import { getProfile } from "@/modules/profile/queries";

export const metadata = { title: "Journal" };

async function Journal() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <JournalBoard
      entries={await listJournalEntries(user.id)}
      today={todayInZone(profile.timezone)}
    />
  );
}

export default function JournalPage() {
  return (
    <PageShell
      title="Journal"
      description="Write it down or say it out loud. Moly reads it back when you ask."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card p-5">
            <RowsSkeleton rows={4} />
          </div>
        }
      >
        <Journal />
      </Suspense>
    </PageShell>
  );
}
