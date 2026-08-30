import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { QuickCreateDialog } from "@/components/layout/quick-create-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { formatLongDate, todayInZone, zonedDayRange } from "@/lib/day";
import { DayTimeline } from "@/modules/events/components/day-timeline";
import { listEventsForDay } from "@/modules/events/queries";
import { getProfile } from "@/modules/profile/queries";

export const metadata = { title: "Calendar" };

async function Today() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const day = todayInZone(profile.timezone);
  const { start, end } = zonedDayRange(day, profile.timezone);

  return <DayTimeline events={await listEventsForDay(user.id, start, end)} />;
}

async function NewEventButton() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <QuickCreateDialog kind="event" day={todayInZone(profile.timezone)} />
  );
}

async function DateLine() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      {formatLongDate(todayInZone(profile.timezone), profile.timezone)}
    </p>
  );
}

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      actions={
        <Suspense fallback={<Skeleton className="h-8 w-28 rounded-md" />}>
          <NewEventButton />
        </Suspense>
      }
    >
      <Suspense fallback={null}>
        <DateLine />
      </Suspense>
      <div className="mt-4">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
          <Today />
        </Suspense>
      </div>
    </PageShell>
  );
}
