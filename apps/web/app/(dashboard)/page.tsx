import { Suspense } from "react";
import {
  AlarmClockIcon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { GlanceStrip, type GlanceTile } from "@/components/layout/glance-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import {
  formatTimeInZone,
  todayInZone,
  zonedDayRange,
} from "@/lib/day";
import { CalendarNav } from "@/modules/events/components/calendar-nav";
import { DayTimeline } from "@/modules/events/components/day-timeline";
import { listEventsForRange } from "@/modules/events/queries";
import { toCalendarItems } from "@/modules/events/schema";
import { MoneySnapshot } from "@/modules/finance/components/money-snapshot";
import {
  getWalletBalance,
  listCategories,
  listTransactions,
} from "@/modules/finance/queries";
import { formatMoney } from "@/modules/finance/schema";
import { JournalSnapshot } from "@/modules/journal/components/journal-snapshot";
import { lastJournalEntry } from "@/modules/journal/queries";
import { NotesRail } from "@/modules/notes/components/notes-rail";
import { ScratchPad } from "@/modules/notes/components/scratch-pad";
import { getScratchPad, listRecentNotes } from "@/modules/notes/queries";
import { getProfile } from "@/modules/profile/queries";
import { TaskList } from "@/modules/tasks/components/task-list";
import { listRemindersForRange, listTasksForDay } from "@/modules/tasks/queries";

export const metadata = { title: "Overview" };

/**
 * Today, on one screen.
 *
 * Every panel resolves its own data so one slow query never blocks the rest,
 * and the queries repeat across panels on purpose: they are the same cached
 * calls with the same arguments, so the second caller is a cache hit rather
 * than a second round trip.
 */
async function HeaderPanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const name = profile.display_name ?? user.email?.split("@")[0] ?? "there";

  return (
    <DashboardHeader
      name={name}
      day={todayInZone(profile.timezone)}
      timezone={profile.timezone}
    />
  );
}

async function GlancePanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const timeZone = profile.timezone;
  const day = todayInZone(timeZone);
  const { start, end } = zonedDayRange(day, timeZone);
  const month = day.slice(0, 7);

  const [tasks, events, reminders, balance, journal] = await Promise.all([
    listTasksForDay(user.id, day),
    listEventsForRange(user.id, start, end),
    listRemindersForRange(user.id, start, end),
    getWalletBalance(user.id),
    lastJournalEntry(user.id),
  ]);

  const open = tasks.filter((task) => task.status !== "done");
  const now = new Date().toISOString();
  const upcoming = toCalendarItems(events, reminders).filter(
    (item) => item.at >= now,
  );
  const next = upcoming[0];

  const tiles: GlanceTile[] = [
    {
      label: "Left today",
      value: `${open.length}`,
      hint:
        open.length === 0
          ? tasks.length > 0
            ? "All done"
            : "Nothing planned"
          : open[0].title,
      href: "/tasks",
      icon: CheckmarkCircle02Icon,
    },
    {
      label: "Up next",
      value: next ? formatTimeInZone(next.at, timeZone) : "—",
      hint: next?.title ?? "Nothing left today",
      href: "/calendar",
      icon: AlarmClockIcon,
    },
    {
      label: "Wallet",
      value: formatMoney(Math.abs(balance), profile.currency),
      hint: balance < 0 ? "Overdrawn" : `${month} so far`,
      href: "/finance",
      icon: Wallet01Icon,
      tone: balance < 0 ? "negative" : undefined,
    },
    {
      label: "Journal",
      value: journal?.day === day ? "Written" : "Not yet",
      hint: journal ? `Last: ${journal.day}` : "Nothing written yet",
      href: "/journal",
      icon: Book02Icon,
    },
  ];

  return <GlanceStrip tiles={tiles} />;
}

async function TasksPanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const day = todayInZone(profile.timezone);

  return (
    <section
      aria-labelledby="tasks-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="tasks-heading" className="text-base font-medium">
        Today&apos;s plan
      </h2>
      <div className="mt-3">
        <TaskList
          tasks={await listTasksForDay(user.id, day)}
          day={day}
          timeZone={profile.timezone}
        />
      </div>
    </section>
  );
}

async function CalendarPanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const day = todayInZone(profile.timezone);
  const { start, end } = zonedDayRange(day, profile.timezone);
  const [events, reminders] = await Promise.all([
    listEventsForRange(user.id, start, end),
    listRemindersForRange(user.id, start, end),
  ]);

  return (
    <DayTimeline
      items={toCalendarItems(events, reminders)}
      timeZone={profile.timezone}
      nav={<CalendarNav active="day" />}
    />
  );
}

async function MoneyPanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const month = todayInZone(profile.timezone).slice(0, 7);

  const [transactions, categories, balance] = await Promise.all([
    listTransactions(user.id, month),
    listCategories(user.id),
    getWalletBalance(user.id),
  ]);

  return (
    <MoneySnapshot
      transactions={transactions}
      categories={categories}
      balance={balance}
      currency={profile.currency}
    />
  );
}

async function JournalPanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <JournalSnapshot
      entry={await lastJournalEntry(user.id)}
      today={todayInZone(profile.timezone)}
    />
  );
}

async function NotesPanel() {
  const user = await requireUser();
  return <NotesRail notes={await listRecentNotes(user.id)} />;
}

async function ScratchPanel() {
  const user = await requireUser();
  return <ScratchPad initialBody={await getScratchPad(user.id)} />;
}

function PanelSkeleton({ className }: { className: string }) {
  return <Skeleton className={`w-full rounded-2xl ${className}`} />;
}

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5 pt-4 pb-safe-b sm:pt-6">
      <Suspense fallback={<PanelSkeleton className="h-20" />}>
        <HeaderPanel />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <PanelSkeleton key={index} className="h-24" />
            ))}
          </div>
        }
      >
        <GlancePanel />
      </Suspense>

      {/* Two columns from lg: the day on the left, everything that reports on
          it down the right. One column on phones, in the order you'd read it. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Suspense fallback={<PanelSkeleton className="h-72" />}>
            <TasksPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton className="h-64" />}>
            <CalendarPanel />
          </Suspense>
        </div>

        <div className="flex flex-col gap-5">
          <Suspense fallback={<PanelSkeleton className="h-64" />}>
            <MoneyPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton className="h-40" />}>
            <JournalPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton className="h-56" />}>
            <ScratchPanel />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<PanelSkeleton className="h-56" />}>
        <NotesPanel />
      </Suspense>

      <div className="pb-6" />
    </div>
  );
}
