import { formatLongDate, greetingFor, hourInZone } from "@/lib/day";
import { QuickCreateDialog } from "./quick-create-dialog";

export function DashboardHeader({
  name,
  day,
  timezone,
}: {
  name: string;
  day: string;
  timezone: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="t-rise">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {greetingFor(hourInZone(timezone))}, {name}{" "}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatLongDate(day, timezone)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickCreateDialog kind="note" day={day} />
        <QuickCreateDialog kind="event" day={day} />
        <QuickCreateDialog kind="task" day={day} />
      </div>
    </header>
  );
}
