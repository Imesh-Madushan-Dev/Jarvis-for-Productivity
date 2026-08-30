import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
};

export async function getProfile(userId: string): Promise<Profile> {
  "use cache: private";
  cacheTag(`profile:${userId}`);
  cacheLife({ stale: 300 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name,avatar_url,timezone")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data ?? { display_name: null, avatar_url: null, timezone: "UTC" };
}
