"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Pick a name.").max(80),
  // Validated against the runtime's own zone table rather than a hardcoded list.
  timezone: z.string().refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: "That isn't a timezone we recognise." },
  ),
  // ISO 4217 is always three letters; Intl rejects anything it cannot format.
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use a three-letter currency code.")
    .refine(
      (value) => {
        try {
          new Intl.NumberFormat("en-US", { style: "currency", currency: value });
          return true;
        } catch {
          return false;
        }
      },
      { message: "That isn't a currency code we recognise." },
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Those details aren't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
    })
    .eq("id", user.id);

  if (error) return fail(toUserMessage(error));

  // The timezone decides which day every panel queries, so drop those too.
  invalidate(`profile:${user.id}`);
  invalidate(`tasks:${user.id}`);
  invalidate(`events:${user.id}`);
  invalidate(`transactions:${user.id}`);
  return ok();
}
