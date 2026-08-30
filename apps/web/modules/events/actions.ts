"use server";

import { invalidate } from "@/lib/cache";

import { requireUser } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { createEventSchema, type CreateEventInput } from "./schema";

export async function createEvent(
  input: CreateEventInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That event isn't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      location: parsed.data.location ?? null,
      all_day: parsed.data.allDay,
    })
    .select("id")
    .single();

  if (error) return fail(toUserMessage(error));

  invalidate(`events:${user.id}`);
  return ok(data);
}
