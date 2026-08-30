import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { EVENT_COLUMNS, type EventListItem } from "./schema";

/**
 * Always bounded by an explicit window, so a month view costs one query and
 * the payload can never grow with the calendar.
 */
export async function listEventsForRange(
  userId: string,
  startIso: string,
  endIso: string,
  limit = 50,
): Promise<EventListItem[]> {
  "use cache: private";
  cacheTag(`events:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("user_id", userId)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
