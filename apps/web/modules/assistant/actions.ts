"use server";

import { requireUser } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import {
  listThreadMessages,
  listThreads,
  type ThreadSummary,
} from "./queries";

export async function fetchThreads(): Promise<ThreadSummary[]> {
  const user = await requireUser();
  return listThreads(user.id);
}

export async function fetchThread(threadId: string) {
  const user = await requireUser();
  return listThreadMessages(user.id, threadId);
}

export async function deleteThread(threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Messages go with it via `on delete cascade`.
  const { error } = await supabase
    .from("threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));
  return ok();
}
