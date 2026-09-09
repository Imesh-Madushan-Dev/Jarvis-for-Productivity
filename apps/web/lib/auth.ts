import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";

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
 * `use cache: private` rather than connection(): every panel on the dashboard
 * awaits this first, so a request-time scope here held the entire tree out of
 * the App Shell — meaning every soft navigation re-streamed every panel and
 * the app flashed skeletons instead of feeling like an app. A private cache is
 * browser-memory only and keyed to the session, and it is skipped during
 * static shell generation, so the Date.now() supabase-js uses to check token
 * expiry never reaches the prerenderer either. `stale` must be >= 300 for the
 * result to be included in the App Shell.
 */
async function readSession(): Promise<SessionUser | null> {
  "use cache: private";
  cacheTag("session");
  cacheLife({ stale: 300 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const id = data?.claims.sub;
  return id ? { id, email: data?.claims.email ?? null } : null;
}

/**
 * Wrapped in React cache(): the redirect has to live outside the cached scope,
 * and this dedupes the wrapper across the dozen panels that call it.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await readSession();
  if (!user) redirect("/login");
  return user;
});
