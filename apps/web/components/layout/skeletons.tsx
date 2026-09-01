import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons stand in for the *shape* of what is loading, never for the page.
 *
 * A single grey slab the size of the viewport reads as "the app is broken";
 * the same wait spent behind a list of row-shaped placeholders reads as "the
 * rows are on their way". Page chrome — title, description, toolbars — is
 * rendered outside the Suspense boundary and never has a skeleton at all.
 */
export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/5 rounded" />
          </div>
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({
  count = 3,
  className = "grid gap-3 sm:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
