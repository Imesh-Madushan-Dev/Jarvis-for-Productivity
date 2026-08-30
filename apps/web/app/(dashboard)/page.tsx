import { Suspense } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { todayInZone, zonedDayRange } from "@/lib/day";
import { DayTimeline } from "@/modules/events/components/day-timeline";
import { listEventsForDay } from "@/modules/events/queries";
import { NotesRail } from "@/modules/notes/components/notes-rail";
import { ScratchPad } from "@/modules/notes/components/scratch-pad";
import { getScratchPad, listRecentNotes } from "@/modules/notes/queries";
import { getProfile } from "@/modules/profile/queries";
import { TaskList } from "@/modules/tasks/components/task-list";
import { listTasksForDay } from "@/modules/tasks/queries";

export const metadata = { title: "Overview" };

/** Each panel resolves its own data so one slow query never blocks the rest. */
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

async function NotesPanel() {
  const user = await requireUser();
  return <NotesRail notes={await listRecentNotes(user.id)} />;
}

async function CalendarPanel() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const day = todayInZone(profile.timezone);
  const { start, end } = zonedDayRange(day, profile.timezone);

  return <DayTimeline events={await listEventsForDay(user.id, start, end)} />;
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
        Tasks
      </h2>
      <div className="mt-3">
        <TaskList tasks={await listTasksForDay(user.id, day)} day={day} />
      </div>
    </section>
  );
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

      <Suspense fallback={<PanelSkeleton className="h-56" />}>
        <NotesPanel />
      </Suspense>

      <Suspense fallback={<PanelSkeleton className="h-64" />}>
        <CalendarPanel />
      </Suspense>

      <div className="grid gap-5 pb-6 lg:grid-cols-2">
        <Suspense fallback={<PanelSkeleton className="h-72" />}>
          <TasksPanel />
        </Suspense>
        <Suspense fallback={<PanelSkeleton className="h-72" />}>
          <ScratchPanel />
        </Suspense>
      </div>
    </div>
  );
}
