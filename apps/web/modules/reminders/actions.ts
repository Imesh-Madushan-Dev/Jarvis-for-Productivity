"use server";

import { requireUser } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
};

/**
 * One row per browser. The endpoint is the identity the push service issues,
 * so re-subscribing on the same device updates rather than duplicates.
 */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<ActionResult> {
  if (!input.endpoint || !input.p256dh || !input.auth) {
    return fail("That subscription is incomplete.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );

  if (error) return fail(toUserMessage(error));
  return ok();
}

export async function removePushSubscription(
  endpoint: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));
  return ok();
}

/** Proves the whole path — permission, subscription, VAPID keys, delivery. */
export async function sendTestPush(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { pushToUser, pushReady } = await import("@/lib/push");

  if (!pushReady()) return fail("Push keys aren't configured on the server.");

  const sent = await pushToUser(supabase, user.id, {
    title: "Moly reminders are on",
    body: "This is what a reminder will look like.",
    url: "/",
    tag: "moly-test",
  });

  return sent > 0
    ? ok()
    : fail("No device is registered for notifications yet.");
}
