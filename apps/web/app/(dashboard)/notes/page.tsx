import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { NotesBoard } from "@/modules/notes/components/notes-board";
import { listRecentNotes } from "@/modules/notes/queries";

export const metadata = { title: "Notes" };

async function AllNotes() {
  const user = await requireUser();
  // One client owner below here: it holds the optimistic list, so a new note
  // appears the moment it is submitted rather than a round trip later.
  return <NotesBoard notes={await listRecentNotes(user.id, 60)} />;
}

export default function NotesPage() {
  return (
    <PageShell title="Notes" description="Most recently edited first.">
      {/* Card-shaped, not page-shaped: the header above stays put and only the
          grid that is actually loading is stood in for. */}
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
