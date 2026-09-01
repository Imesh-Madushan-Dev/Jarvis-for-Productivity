"use client";

import { useEffect, useState } from "react";

import { formatTimeInZone, zonedHours } from "@/lib/day";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "../schema";

const START_HOUR = 7;
const END_HOUR = 21;
const SPAN = END_HOUR - START_HOUR;

const HOURS = Array.from({ length: SPAN }, (_, i) => START_HOUR + i);

function hourLabel(hour: number) {
  if (hour === 12) return "Noon";
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DayTimeline({
  items,
  timeZone,
  nav,
}: {
  items: CalendarItem[];
  timeZone: string;
  nav?: React.ReactNode;
}) {
  // Mount-only: the server cannot know the reader's wall clock, and guessing
  // would desync hydration.
  const [nowHours, setNowHours] = useState<number | null>(null);

  useEffect(() => {
    // Positioned against the profile's zone, not the browser's, so a traveller
    // sees the same marker the rest of the dashboard is keyed to.
    const tick = () =>
      setNowHours(zonedHours(new Date().toISOString(), timeZone));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timeZone]);

  const marker =
    nowHours !== null && nowHours >= START_HOUR && nowHours <= END_HOUR
      ? ((nowHours - START_HOUR) / SPAN) * 100
      : null;

  return (
    <section
      aria-labelledby="calendar-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="calendar-heading" className="text-base font-medium">
          Calendar
        </h2>
        {nav}
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-208">
          <div
            className="grid text-xs text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}
          >
            {HOURS.map((hour) => (
              <div key={hour} className="pb-2 text-center">
                {hourLabel(hour)}
              </div>
            ))}
          </div>

          <div className="relative h-40 rounded-lg border border-border">
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-r border-border/60 last:border-r-0"
                />
              ))}
            </div>

            {marker !== null ? (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 z-10 w-px bg-brand"
                style={{ left: `${marker}%` }}
              />
            ) : null}

            {items.length === 0 ? (
              <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Nothing scheduled today.
              </p>
            ) : (
              items.map((item) => {
                const start = clamp(
                  zonedHours(item.at, timeZone),
                  START_HOUR,
                  END_HOUR,
                );
                const left = ((start - START_HOUR) / SPAN) * 100;
                // A reminder is an instant, not a span, so it gets a fixed
                // narrow pin instead of a block sized by its duration.
                const width =
                  item.kind === "reminder" ? 100 / SPAN : (0.75 / SPAN) * 100;

                return (
                  <article
                    key={item.id}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    className={cn(
                      "t-lift absolute inset-y-2 z-20 overflow-hidden rounded-md px-2 py-1.5",
                      item.kind === "reminder"
                        ? "border border-dashed border-brand/60"
                        : "border-l-2 border-brand bg-brand-muted",
                    )}
                  >
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.kind === "reminder" ? "⏰ " : ""}
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                      {formatTimeInZone(item.at, timeZone)}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
