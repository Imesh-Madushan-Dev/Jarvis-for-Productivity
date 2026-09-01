"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

/**
 * Every field optional: settings is several small forms now, and each saves
 * only what it owns. `undefined` means "leave it alone" — which is different
 * from a blank string, and why this is not one big form any more.
 */
const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1, "Pick a name.").max(80).optional(),
  // Validated against the runtime's own zone table rather than a hardcoded list.
  timezone: z
    .string()
    .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
      { message: "That isn't a timezone we recognise." },
    )
    .optional(),
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
    )
    .optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Nothing to save.",
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

  const patch = {
    ...(parsed.data.displayName !== undefined && {
      display_name: parsed.data.displayName,
    }),
    ...(parsed.data.timezone !== undefined && {
      timezone: parsed.data.timezone,
    }),
    ...(parsed.data.currency !== undefined && {
      currency: parsed.data.currency,
    }),
  };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return fail(toUserMessage(error));

  // The timezone decides which day every panel queries, so drop those too.
  invalidate(`profile:${user.id}`);
  invalidate(`tasks:${user.id}`);
  invalidate(`events:${user.id}`);
  invalidate(`transactions:${user.id}`);
  return ok();
}
