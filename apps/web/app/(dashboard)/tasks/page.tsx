import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { QuickCreateDialog } from "@/components/layout/quick-create-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { todayInZone } from "@/lib/day";
import { getProfile } from "@/modules/profile/queries";
import { TaskList } from "@/modules/tasks/components/task-list";
import { listAllTasks } from "@/modules/tasks/queries";

export const metadata = { title: "Tasks" };

async function AllTasks() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const day = todayInZone(profile.timezone);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <TaskList tasks={await listAllTasks(user.id)} day={day} />
    </section>
  );
}

async function NewTaskButton() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <QuickCreateDialog kind="task" day={todayInZone(profile.timezone)} />
  );
}

export default function TasksPage() {
  return (
    <PageShell
      title="Tasks"
      description="Everything on the board, soonest first."
      actions={
        <Suspense fallback={<Skeleton className="h-8 w-24 rounded-md" />}>
          <NewTaskButton />
        </Suspense>
      }
    >
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
        <AllTasks />
      </Suspense>
    </PageShell>
  );
}
