"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/result";

/** POST-only by virtue of being an action — a GET route would let any
 *  prefetcher or link scanner sign the user out. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Deliberately vague: distinguishing "no such user" from "wrong password"
  // turns the form into an account-enumeration oracle.
  if (error) return fail("That email and password don't match.");
  return ok();
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return fail(
      error.message.toLowerCase().includes("password")
        ? "Pick a password with at least 6 characters."
        : "We couldn't create that account.",
    );
  }

  return ok({ needsConfirmation: data.session === null });
}
