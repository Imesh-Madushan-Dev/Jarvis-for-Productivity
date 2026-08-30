import {
  dayOfInstant,
  formatDayNumber,
  formatTimeInZone,
  formatWeekdayShort,
} from "@/lib/day";
import { cn } from "@/lib/utils";
import type { EventListItem } from "../schema";

/** One pass over the result set; cells then read their own bucket. */
function groupByDay(events: EventListItem[], timeZone: string) {
  const byDay = new Map<string, EventListItem[]>();
  for (const event of events) {
    const day = dayOfInstant(event.starts_at, timeZone);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(event);
    else byDay.set(day, [event]);
  }
  return byDay;
}

function EventChip({
  event,
  timeZone,
  showTime = true,
}: {
  event: EventListItem;
  timeZone: string;
  showTime?: boolean;
}) {
  return (
    <li className="t-lift rounded-md border-l-2 border-brand bg-brand-muted px-2 py-1">
      <p className="truncate text-xs font-medium text-foreground">
        {event.title}
      </p>
      {showTime && !event.all_day ? (
        <p className="truncate text-[0.7rem] text-muted-foreground">
          {formatTimeInZone(event.starts_at, timeZone)}
        </p>
      ) : null}
    </li>
  );
}

export function WeekGrid({
  days,
  events,
  timeZone,
  today,
}: {
  days: string[];
  events: EventListItem[];
  timeZone: string;
  today: string;
}) {
  const byDay = groupByDay(events, timeZone);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-208 grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = byDay.get(day) ?? [];
          const isToday = day === today;

          return (
            <section
              key={day}
              aria-label={day}
              className={cn(
                "flex min-h-40 flex-col rounded-xl border p-3",
                isToday ? "border-brand bg-brand-muted/20" : "border-border",
              )}
            >
              <header className="flex items-baseline justify-between gap-1">
                <span className="text-xs text-muted-foreground">
                  {formatWeekdayShort(day)}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isToday ? "font-semibold text-foreground" : "text-foreground",
                  )}
                >
                  {formatDayNumber(day)}
                </span>
              </header>

              {dayEvents.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground/60">—</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {dayEvents.map((event) => (
                    <EventChip
                      key={event.id}
                      event={event}
                      timeZone={timeZone}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const MAX_PER_CELL = 2;

export function MonthGrid({
  days,
  events,
  timeZone,
  today,
  month,
}: {
  days: string[];
  events: EventListItem[];
  timeZone: string;
  today: string;
  /** YYYY-MM of the month in focus; other cells are leading/trailing days. */
  month: string;
}) {
  const byDay = groupByDay(events, timeZone);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-176">
        <div className="grid grid-cols-7 gap-2 pb-2">
          {days.slice(0, 7).map((day) => (
            <p
              key={day}
              className="text-center text-xs text-muted-foreground"
            >
              {formatWeekdayShort(day)}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = byDay.get(day) ?? [];
            const overflow = dayEvents.length - MAX_PER_CELL;
            const isToday = day === today;
            const outside = !day.startsWith(month);

            return (
              <section
                key={day}
                aria-label={day}
                className={cn(
                  "flex min-h-24 flex-col rounded-lg border p-2",
                  isToday ? "border-brand bg-brand-muted/20" : "border-border",
                  outside && "opacity-45",
                )}
              >
                <span
                  className={cn(
                    "text-xs",
                    isToday
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {formatDayNumber(day)}
                </span>

                {dayEvents.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {dayEvents.slice(0, MAX_PER_CELL).map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        timeZone={timeZone}
                        showTime={false}
                      />
                    ))}
                  </ul>
                ) : null}

                {overflow > 0 ? (
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">
                    +{overflow} more
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
