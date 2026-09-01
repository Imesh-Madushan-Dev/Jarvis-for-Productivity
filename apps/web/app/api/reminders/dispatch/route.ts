import { createClient as createServiceClient } from "@supabase/supabase-js";

import { pushReady, pushToUser } from "@/lib/push";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/** Only ever fires reminders that are already due; never looks ahead. */
const BATCH = 100;

type Due = {
  id: string;
  user_id: string;
  title: string;
  kind: "task" | "event";
  when: string | null;
};

/**
 * Claims and sends whatever is due.
 *
 * Two callers, deliberately:
 *
 * - the scheduler (pg_cron → pg_net), with `authorization: Bearer
 *   $REMINDER_DISPATCH_SECRET`, running as service role over every user;
 * - an open tab, on its own session, running over that one user. That is what
 *   makes reminders work in development and while you are using the app,
 *   before any cron exists.
 *
 * The claim is the `reminded_at is null` filter inside the UPDATE, so two runs
 * overlapping cannot both take the same row: whoever's UPDATE lands first gets
 * it back from RETURNING, and the other gets nothing.
 */
export async function POST(request: Request) {
  const secret = process.env.REMINDER_DISPATCH_SECRET;
  const authorized =
    secret && request.headers.get("authorization") === `Bearer ${secret}`;

  let supabase;
  let onlyUser: string | null = null;

  if (authorized) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return Response.json({ error: "not_configured" }, { status: 501 });
    }
    // Service role: the scheduler has no session and must see every user's
    // due rows. RLS is bypassed here, so this branch is gated on the secret.
    supabase = createServiceClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
  } else {
    supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const id = data?.claims.sub;
    if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
    onlyUser = id;
  }

  if (!pushReady()) {
    return Response.json({ error: "no_vapid_keys" }, { status: 501 });
  }

  const now = new Date().toISOString();
  const due: Due[] = [];

  const taskQuery = supabase
    .from("tasks")
    .update({ reminded_at: now })
    .lte("remind_at", now)
    .is("reminded_at", null)
    .neq("status", "done")
    .select("id,user_id,title,remind_at")
    .limit(BATCH);
  if (onlyUser) taskQuery.eq("user_id", onlyUser);

  const eventQuery = supabase
    .from("events")
    .update({ reminded_at: now })
    .lte("remind_at", now)
    .is("reminded_at", null)
    .select("id,user_id,title,starts_at")
    .limit(BATCH);
  if (onlyUser) eventQuery.eq("user_id", onlyUser);

  const [tasks, events] = await Promise.all([taskQuery, eventQuery]);

  if (tasks.error || events.error) {
    console.error("[reminders] claim failed", tasks.error ?? events.error);
    return Response.json({ error: "claim_failed" }, { status: 500 });
  }

  for (const row of tasks.data ?? []) {
    due.push({ ...row, kind: "task", when: row.remind_at });
  }
  for (const row of events.data ?? []) {
    due.push({ ...row, kind: "event", when: row.starts_at });
  }

  let sent = 0;
  for (const item of due) {
    sent += await pushToUser(supabase, item.user_id, {
      title: item.kind === "event" ? "Coming up" : "Reminder",
      body: item.title,
      url: item.kind === "event" ? "/calendar" : "/tasks",
      tag: `${item.kind}-${item.id}`,
    });
  }

  return Response.json({ claimed: due.length, sent });
}
