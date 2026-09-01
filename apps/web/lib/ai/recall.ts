import "server-only";

import { requireUser } from "@/lib/auth";
import { embedText } from "@/lib/ai/embeddings";
import { createClient } from "@/lib/supabase/server";

export type RecallSource = "journal" | "note" | "task" | "event";

export type RecallHit = {
  source: RecallSource;
  id: string;
  day: string | null;
  title: string;
  snippet: string;
  score: number;
};

export type RecallInput = {
  query: string;
  from?: string | null;
  to?: string | null;
  limit?: number;
  sources?: RecallSource[] | null;
};

/**
 * One ranked list across the journal, notes, tasks and events.
 *
 * Everything expensive happens in Postgres: the fusion, and the trimming of
 * each snippet to 300 characters. What comes back is already the size it will
 * be in the prompt — the app never fetches a body it would only throw away.
 *
 * The query embedding is optional by design. With no provider key this
 * degrades to words and recency rather than failing.
 */
export async function recall(input: RecallInput): Promise<RecallHit[]> {
  const query = input.query?.trim();
  if (!query) return [];

  await requireUser();
  const supabase = await createClient();
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("recall", {
    p_query: query,
    p_embedding: embedding?.vector ?? null,
    p_model: embedding?.model ?? null,
    // Six is what fits in a reply without padding the prompt; the cap in SQL
    // is 20 whatever a caller asks for.
    p_limit: Math.min(input.limit ?? 6, 20),
    p_from: input.from ?? null,
    p_to: input.to ?? null,
    p_sources: input.sources ?? null,
  });

  if (error) {
    console.error("[recall] failed", error);
    return [];
  }

  return (data ?? []) as RecallHit[];
}
