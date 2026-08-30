import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * The real authorization boundary for every server read and write.
 *
 * connection() marks the scope request-time. Without it the prerenderer trips
 * over the Date.now() that supabase-js uses internally to check token expiry —
 * and since every panel funnels through here, one call covers the whole tree.
 * Safe because this is never called from inside a `use cache` scope, where
 * connection() is prohibited.
 *
 * Wrapped in React cache(): every Suspense panel on the dashboard calls this,
 * and without dedupe each one would be its own getUser() round trip.
 */
export const requireUser = cache(async () => {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user;
});
