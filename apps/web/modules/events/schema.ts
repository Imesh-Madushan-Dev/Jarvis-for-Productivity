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
