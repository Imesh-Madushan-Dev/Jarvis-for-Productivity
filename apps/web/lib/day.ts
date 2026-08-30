import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/** YYYY-MM-DD for "now" in an IANA zone. en-CA is already ISO-shaped. */
export function todayInZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/**
 * The UTC instants that bound a local calendar day.
 *
 * ponytail: one offset probe at midnight, so a day containing a DST jump can be
 * an hour off at its far edge. Harmless for a planner; replace with Temporal
 * once it is available everywhere.
 */
export function zonedDayRange(day: string, timeZone: string) {
  const utcMidnight = new Date(`${day}T00:00:00Z`);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcMidnight);

  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asZoned = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );

  const start = new Date(utcMidnight.getTime() * 2 - asZoned);
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatLongDate(day: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function hourInZone(timeZone: string, now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      hour: "2-digit",
    }).format(now),
  );
}

/* ---------------------------------------------------------- Calendar grids */

const WEEK_STARTS_ON = 1; // Monday

/**
 * date-fns works in the runtime's local time, so a YYYY-MM-DD is rebuilt from
 * its components rather than parsed as an instant. Parsing "2026-08-30" gives
 * UTC midnight, which is the day before on any negative-offset server.
 */
function anchor(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

function toDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

/** The seven days of the week containing `day`, Monday first. */
export function weekDays(day: string): string[] {
  const start = startOfWeek(anchor(day), { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, index) => toDay(addDays(start, index)));
}

/** Whole weeks covering the month containing `day` — 35 or 42 cells. */
export function monthDays(day: string): string[] {
  const base = anchor(day);
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(base), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(base), { weekStartsOn: WEEK_STARTS_ON }),
  }).map(toDay);
}

/** UTC instants spanning a run of calendar days, for one bounded query. */
export function rangeForDays(days: string[], timeZone: string) {
  return {
    start: zonedDayRange(days[0], timeZone).start,
    end: zonedDayRange(days[days.length - 1], timeZone).end,
  };
}

/** Which local day an instant falls on, for bucketing events into cells. */
export function dayOfInstant(iso: string, timeZone: string): string {
  return todayInZone(timeZone, new Date(iso));
}

/** Fractional hour of an instant in the reader's zone, for positioning. */
export function zonedHours(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));

  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return part("hour") + part("minute") / 60;
}

export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Calendar labels come from the date string itself; it is already a local
// calendar date, so applying a timezone again would shift it.
export function formatMonthTitle(day: string): string {
  const [year, month] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatWeekdayShort(day: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    anchor(day),
  );
}

export function formatDayNumber(day: string): string {
  return String(anchor(day).getDate());
}

export function formatWeekTitle(days: string[]): string {
  const first = anchor(days[0]);
  const last = anchor(days[days.length - 1]);
  const sameMonth = first.getMonth() === last.getMonth();

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(first);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  }).format(last);

  return `${startLabel} – ${endLabel}`;
}
