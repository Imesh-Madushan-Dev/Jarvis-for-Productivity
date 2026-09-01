import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { QuickCreateDialog } from "@/components/layout/quick-create-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import {
  formatLongDate,
  formatMonthTitle,
  formatWeekTitle,
  monthDays,
  rangeForDays,
  todayInZone,
  weekDays,
  zonedDayRange,
} from "@/lib/day";
import {
  MonthGrid,
  WeekGrid,
} from "@/modules/events/components/calendar-grids";
import {
  CalendarNav,
  toCalendarView,
  type CalendarView,
} from "@/modules/events/components/calendar-nav";
import { DayTimeline } from "@/modules/events/components/day-timeline";
import { listEventsForRange } from "@/modules/events/queries";
import { getProfile } from "@/modules/profile/queries";

export const metadata = { title: "Calendar" };

// A month of events is still one bounded query; the cap is a runaway guard.
const ROW_LIMIT: Record<CalendarView, number> = {
  day: 50,
  week: 200,
  month: 500,
};

async function CalendarBody({ view }: { view: CalendarView }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const timeZone = profile.timezone;
  const today = todayInZone(timeZone);

  if (view === "day") {
    const { start, end } = zonedDayRange(today, timeZone);
    const events = await listEventsForRange(
      user.id,
      start,
      end,
      ROW_LIMIT.day,
    );

    return (
      <>
        <p className="mb-4 text-sm text-muted-foreground">
          {formatLongDate(today, timeZone)}
        </p>
        <DayTimeline
          events={events}
          timeZone={timeZone}
          nav={<CalendarNav active="day" />}
        />
      </>
    );
  }

  const days = view === "week" ? weekDays(today) : monthDays(today);
  const { start, end } = rangeForDays(days, timeZone);
  const events = await listEventsForRange(
    user.id,
    start,
    end,
    ROW_LIMIT[view],
  );

  return (
    <section
      aria-labelledby="calendar-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="calendar-heading" className="text-base font-medium">
          {view === "week" ? formatWeekTitle(days) : formatMonthTitle(today)}
        </h2>
        <CalendarNav active={view} />
      </div>

      <div className="mt-4">
        {view === "week" ? (
          <WeekGrid
            days={days}
            events={events}
            timeZone={timeZone}
            today={today}
          />
        ) : (
          <MonthGrid
            days={days}
            events={events}
            timeZone={timeZone}
            today={today}
            month={today.slice(0, 7)}
          />
        )}
      </div>
    </section>
  );
}

async function NewEventButton() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <QuickCreateDialog kind="event" day={todayInZone(profile.timezone)} />;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const active = toCalendarView(view);

  return (
    <PageShell
      title="Calendar"
      actions={
        <Suspense fallback={<Skeleton className="h-8 w-28 rounded-md" />}>
          <NewEventButton />
        </Suspense>
      }
    >
      {/* Keyed on the view so switching shows the skeleton instead of holding
          the previous grid on screen while the new range loads. */}
      <Suspense
        key={active}
        fallback={
          <div className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="mt-4 h-56 w-full rounded-xl" />
          </div>
        }
      >
        <CalendarBody view={active} />
      </Suspense>
    </PageShell>
  );
}
