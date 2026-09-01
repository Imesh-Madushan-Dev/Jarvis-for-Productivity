import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { JOURNAL_COLUMNS, type JournalEntry } from "./schema";

/** Newest first, bounded. The journal page pages by count, not by date. */
export async function listJournalEntries(
  userId: string,
  limit = 40,
): Promise<JournalEntry[]> {
  "use cache: private";
  cacheTag(`journal:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select(JOURNAL_COLUMNS)
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function listJournalForDay(
  userId: string,
  day: string,
): Promise<JournalEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select(JOURNAL_COLUMNS)
    .eq("user_id", userId)
    .eq("day", day)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

/** How many of the last N days have an entry — the only stat worth showing. */
export async function journalStreak(userId: string, days = 30) {
  "use cache: private";
  cacheTag(`journal:${userId}`);
  cacheLife({ stale: 300 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("day")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(200);

  const unique = new Set((data ?? []).map((row) => row.day));
  return { entries: data?.length ?? 0, days: unique.size, window: days };
}

/** The most recent entry, for the overview card. One row, one column set. */
export async function lastJournalEntry(
  userId: string,
): Promise<JournalEntry | null> {
  "use cache: private";
  cacheTag(`journal:${userId}`);
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select(JOURNAL_COLUMNS)
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
