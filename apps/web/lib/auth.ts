import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

/**
 * The real authorization boundary for every server read and write.
 *
 * getClaims() rather than getUser(): getUser asks the Auth server to validate
 * the token, which is a network round trip in front of every single render.
 * getClaims verifies the JWT against the project's public key locally when the
 * project uses asymmetric signing keys, and falls back to the same round trip
 * when it does not — so this is never slower and is much faster once JWT
 * signing keys are enabled in the dashboard.
 *
 * connection() marks the scope request-time. Without it the prerenderer trips
 * over the Date.now() that supabase-js uses internally to check token expiry -
 * and since every panel funnels through here, one call covers the whole tree.
 * Safe because this is never called from inside a `use cache` scope, where
 * connection() is prohibited.
 *
 * Wrapped in React cache(): every Suspense panel on the dashboard calls this,
 * and without dedupe each one would repeat the work.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const id = data?.claims.sub;
  if (!id) redirect("/login");

  return { id, email: data?.claims.email ?? null };
});
