import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { QuickCreateDialog } from "@/components/layout/quick-create-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { todayInZone } from "@/lib/day";
import { NotesGrid } from "@/modules/notes/components/notes-grid";
import { listRecentNotes } from "@/modules/notes/queries";
import { getProfile } from "@/modules/profile/queries";

export const metadata = { title: "Notes" };

async function AllNotes() {
  const user = await requireUser();
  return <NotesGrid notes={await listRecentNotes(user.id, 60)} />;
}

async function NewNoteButton() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <QuickCreateDialog kind="note" day={todayInZone(profile.timezone)} />;
}

export default function NotesPage() {
  return (
    <PageShell
      title="Notes"
      description="Most recently edited first."
      actions={
        <Suspense fallback={<Skeleton className="h-8 w-24 rounded-md" />}>
          <NewNoteButton />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        }
      >
        <AllNotes />
      </Suspense>
    </PageShell>
  );
}
