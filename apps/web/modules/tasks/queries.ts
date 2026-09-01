import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { TASK_COLUMNS, type TaskListItem } from "./schema";

/**
 * Caller resolves the user first (see requireUser) and passes the id in, so the
 * auth redirect never happens inside a cached scope.
 *
 * ponytail: 'use cache: private' is browser-memory only - it saves egress on
 * soft navigation, not on cold loads. The narrow column list and row limit are
 * what actually cut bandwidth. If server-side egress ever bites, the upgrade is
 * a shared `use cache` keyed by userId, which needs a service-role client and
 * gives up RLS as the backstop - deliberately not doing that yet.
 */
export async function listTasksForDay(
  userId: string,
  day: string,
): Promise<TaskListItem[]> {
  "use cache: private";
  cacheTag(`tasks:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_COLUMNS},projects(name)`)
    .eq("user_id", userId)
    .eq("planned_date", day)
    .order("position", { ascending: true })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as TaskListItem[];
}

/** Everything on the board, soonest first, unscheduled last. */
export async function listAllTasks(
  userId: string,
  limit = 200,
): Promise<TaskListItem[]> {
  "use cache: private";
  cacheTag(`tasks:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_COLUMNS},projects(name)`)
    .eq("user_id", userId)
    .order("planned_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TaskListItem[];
}

/**
 * Tasks with a reminder inside a window, for the calendar. Same shape of read
 * as events: bounded, narrow, ordered by the time it draws at.
 */
export async function listRemindersForRange(
  userId: string,
  startIso: string,
  endIso: string,
  limit = 200,
): Promise<TaskListItem[]> {
  "use cache: private";
  cacheTag(`tasks:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_COLUMNS},projects(name)`)
    .eq("user_id", userId)
    .not("remind_at", "is", null)
    .gte("remind_at", startIso)
    .lt("remind_at", endIso)
    .order("remind_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TaskListItem[];
}
