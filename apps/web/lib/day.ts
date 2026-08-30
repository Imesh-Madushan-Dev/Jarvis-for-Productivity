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
