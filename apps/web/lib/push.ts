import "server-only";

import webpush from "web-push";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

/** Configured lazily: the keys are optional, and their absence must not crash a render. */
let configured = false;

export function pushReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

function configure() {
  if (configured || !pushReady()) return pushReady();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:reminders@moly.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

/**
 * Sends one notification to every device the user has registered.
 *
 * A push service answering 404 or 410 means that subscription is dead for good
 * — the browser was reinstalled, the site data cleared — so it is deleted
 * rather than retried forever. Any other failure is logged and left alone.
 */
export async function pushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!configure()) return 0;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .limit(20);

  if (!subscriptions?.length) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(subscription.id);
        else console.error("[push] send failed", status, error);
      }
    }),
  );

  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }

  if (sent > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return sent;
}
