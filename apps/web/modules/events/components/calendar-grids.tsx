import {
  dayOfInstant,
  formatDayNumber,
  formatTimeInZone,
  formatWeekdayShort,
} from "@/lib/day";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "../schema";

/** One pass over the result set; cells then read their own bucket. */
function groupByDay(items: CalendarItem[], timeZone: string) {
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const day = dayOfInstant(item.at, timeZone);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(item);
    else byDay.set(day, [item]);
  }
  return byDay;
}

/** A reminder is dashed and quieter than an event: it is a nudge, not a block. */
function ItemChip({
  item,
  timeZone,
  showTime = true,
}: {
  item: CalendarItem;
  timeZone: string;
  showTime?: boolean;
}) {
  const reminder = item.kind === "reminder";

  return (
    <li
      className={cn(
        "t-lift rounded-md px-2 py-1",
        reminder
          ? "border border-dashed border-brand/60 bg-transparent"
          : "border-l-2 border-brand bg-brand-muted",
      )}
    >
      <p className="truncate text-xs font-medium text-foreground">
        {reminder ? "⏰ " : ""}
        {item.title}
      </p>
      {showTime && !item.allDay ? (
        <p className="truncate text-[0.7rem] text-muted-foreground">
          {formatTimeInZone(item.at, timeZone)}
        </p>
      ) : null}
    </li>
  );
}

export function WeekGrid({
  days,
  items,
  timeZone,
  today,
}: {
  days: string[];
  items: CalendarItem[];
  timeZone: string;
  today: string;
}) {
  const byDay = groupByDay(items, timeZone);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-208 grid-cols-7 gap-2">
        {days.map((day) => {
          const dayItems = byDay.get(day) ?? [];
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

              {dayItems.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground/60">-</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {dayItems.map((item) => (
                    <ItemChip key={item.id} item={item} timeZone={timeZone} />
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
  items,
  timeZone,
  today,
  month,
}: {
  days: string[];
  items: CalendarItem[];
  timeZone: string;
  today: string;
  /** YYYY-MM of the month in focus; other cells are leading/trailing days. */
  month: string;
}) {
  const byDay = groupByDay(items, timeZone);

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
            const dayItems = byDay.get(day) ?? [];
            const overflow = dayItems.length - MAX_PER_CELL;
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

                {dayItems.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {dayItems.slice(0, MAX_PER_CELL).map((item) => (
                      <ItemChip
                        key={item.id}
                        item={item}
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
