import { z } from "zod";

export const EVENT_COLUMNS =
  "id,title,starts_at,ends_at,all_day,location" as const;

export type EventListItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string | null;
};

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "Give the event a title.").max(300),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    location: z.string().trim().max(300).nullish(),
    allDay: z.boolean().default(false),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "The event has to end after it starts.",
    path: ["endsAt"],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * What the calendar actually draws. An event and a task's reminder are the
 * same thing to a grid cell — a title at an instant — so they are flattened to
 * one shape here rather than every view learning about both tables.
 */
export type CalendarItem = {
  id: string;
  title: string;
  at: string;
  kind: "event" | "reminder";
  allDay: boolean;
};

export function eventItem(event: EventListItem): CalendarItem {
  return {
    id: `event-${event.id}`,
    title: event.title,
    at: event.starts_at,
    kind: "event",
    allDay: event.all_day,
  };
}

export function reminderItem(task: {
  id: string;
  title: string;
  remind_at: string | null;
}): CalendarItem {
  return {
    id: `task-${task.id}`,
    title: task.title,
    at: task.remind_at ?? "",
    kind: "reminder",
    allDay: false,
  };
}

/** Chronological, so a cell renders its day in the order it happens. */
export function toCalendarItems(
  events: EventListItem[],
  reminders: { id: string; title: string; remind_at: string | null }[],
): CalendarItem[] {
  return [...events.map(eventItem), ...reminders.map(reminderItem)]
    .filter((item) => item.at)
    .sort((a, b) => a.at.localeCompare(b.at));
}
