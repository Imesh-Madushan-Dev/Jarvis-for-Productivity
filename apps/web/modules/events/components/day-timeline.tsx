"use client";

import { useEffect, useState } from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import type { EventListItem } from "../schema";

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

function toHours(iso: string) {
  const date = new Date(iso);
  return date.getHours() + date.getMinutes() / 60;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DayTimeline({ events }: { events: EventListItem[] }) {
  const { value: view, setValue: setView } = useLocalStorage<"today">(
    "moly.calendar.view",
    "today",
  );

  // Mount-only: the server cannot know the reader's wall clock, and guessing
  // would desync hydration.
  const [nowHours, setNowHours] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowHours(now.getHours() + now.getMinutes() / 60);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

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
        <div className="flex items-center gap-1">
          <button
            aria-current={view === "today"}
            onClick={() => setView("today")}
            className="t-press rounded-md px-2 py-1 text-sm text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Today
          </button>
          {["Week", "Month"].map((label) => (
            <button
              key={label}
              disabled
              title="Week and month views are not built yet"
              className="cursor-not-allowed rounded-md px-2 py-1 text-sm text-muted-foreground/50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[52rem]">
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

            {events.length === 0 ? (
              <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Nothing scheduled today.
              </p>
            ) : (
              events.map((event) => {
                const start = clamp(
                  toHours(event.starts_at),
                  START_HOUR,
                  END_HOUR,
                );
                const end = clamp(
                  toHours(event.ends_at),
                  start + 0.25,
                  END_HOUR,
                );
                const left = ((start - START_HOUR) / SPAN) * 100;
                const width = ((end - start) / SPAN) * 100;

                return (
                  <article
                    key={event.id}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    className={cn(
                      "t-lift absolute inset-y-2 z-20 overflow-hidden rounded-md",
                      "border-l-2 border-brand bg-brand-muted px-2 py-1.5",
                    )}
                  >
                    <p className="truncate text-xs font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                      {new Date(event.starts_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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
