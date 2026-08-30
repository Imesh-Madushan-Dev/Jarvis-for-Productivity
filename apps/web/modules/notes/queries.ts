import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { NOTE_COLUMNS, type NoteListItem } from "./schema";

/** The rail shows a handful of cards; never pull the whole table. */
export async function listRecentNotes(
  userId: string,
  limit = 8,
): Promise<NoteListItem[]> {
  "use cache: private";
  cacheTag(`notes:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("user_id", userId)
    .eq("kind", "note")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getScratchPad(userId: string): Promise<string> {
  "use cache: private";
  cacheTag(`scratchpad:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("body")
    .eq("user_id", userId)
    .eq("kind", "scratchpad")
    .maybeSingle();

  if (error) throw error;
  return data?.body ?? "";
}
