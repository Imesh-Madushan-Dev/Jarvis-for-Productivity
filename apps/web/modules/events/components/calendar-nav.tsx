import Link from "next/link";

import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "day", label: "Today", href: "/calendar" },
  { id: "week", label: "Week", href: "/calendar?view=week" },
  { id: "month", label: "Month", href: "/calendar?view=month" },
] as const;

export type CalendarView = (typeof VIEWS)[number]["id"];

export function toCalendarView(value: string | undefined): CalendarView {
  return value === "week" || value === "month" ? value : "day";
}

/**
 * The view lives in the URL, not in client state: each one needs a different
 * query window, so the server has to know which before it renders. It also
 * makes a week or month shareable and back-button friendly.
 */
export function CalendarNav({ active }: { active: CalendarView }) {
  return (
    <nav aria-label="Calendar view" className="flex items-center gap-1">
      {VIEWS.map((view) => (
        <Link
          key={view.id}
          href={view.href}
          aria-current={active === view.id ? "page" : undefined}
          className={cn(
            "t-press rounded-md px-2 py-1 text-sm",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            active === view.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}
