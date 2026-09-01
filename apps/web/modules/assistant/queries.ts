import "server-only";

import type { UIMessage } from "ai";

import { createClient } from "@/lib/supabase/server";

export type ThreadSummary = {
  id: string;
  title: string;
  updated_at: string;
};

/**
 * Read straight through the request client rather than a cached query: the
 * history rail is opened on demand and must show the run that just finished.
 */
export async function listThreads(
  userId: string,
  limit = 50,
): Promise<ThreadSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("threads")
    .select("id,title,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function listThreadMessages(
  userId: string,
  threadId: string,
): Promise<UIMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id,role,parts")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("position")
    .limit(500);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
  }));
}

/**
 * Called from the chat route once a run ends. The whole conversation is
 * upserted rather than diffed - a run is a handful of rows, and "the thread is
 * exactly what the client is holding" is a much easier invariant to keep than
 * an incremental one.
 */
export async function saveThread({
  userId,
  threadId,
  messages,
}: {
  userId: string;
  threadId: string;
  messages: UIMessage[];
}) {
  const supabase = await createClient();

  const firstUserText = messages
    .find((message) => message.role === "user")
    ?.parts.map((part) => ("text" in part ? part.text : ""))
    .join("")
    .trim();

  const title = (firstUserText || "New chat").slice(0, 80);

  const { error: threadError } = await supabase
    .from("threads")
    .upsert({ id: threadId, user_id: userId, title }, { onConflict: "id" });
  if (threadError) throw threadError;

  // Bump updated_at even when the title is unchanged, so the rail orders by
  // last activity rather than by first message.
  await supabase
    .from("threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", userId);

  const rows = messages.map((message, index) => ({
    id: message.id,
    thread_id: threadId,
    user_id: userId,
    role: message.role,
    parts: message.parts as unknown as never,
    position: index,
  }));

  const { error } = await supabase
    .from("messages")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
}
