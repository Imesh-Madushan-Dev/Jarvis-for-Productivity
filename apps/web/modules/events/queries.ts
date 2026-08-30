import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { EVENT_COLUMNS, type EventListItem } from "./schema";

/** Bounded to one day so the payload can't grow with the calendar. */
export async function listEventsForDay(
  userId: string,
  dayStartIso: string,
  dayEndIso: string,
): Promise<EventListItem[]> {
  "use cache: private";
  cacheTag(`events:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("user_id", userId)
    .gte("starts_at", dayStartIso)
    .lt("starts_at", dayEndIso)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}
