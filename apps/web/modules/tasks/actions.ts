"use server";

import { invalidate } from "@/lib/cache";

import { requireUser } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  deleteTaskSchema,
  setTaskStatusSchema,
  type CreateTaskInput,
  type SetTaskStatusInput,
} from "./schema";

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That task isn't valid.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      planned_date: parsed.data.plannedDate ?? null,
      planned_minutes: parsed.data.plannedMinutes ?? null,
      project_id: parsed.data.projectId ?? null,
      // ponytail: append-only ordering. Swap for fractional midpoints between
      // neighbours when drag-to-reorder lands.
      position: Date.now(),
    })
    .select("id")
    .single();

  if (error) return fail(toUserMessage(error));

  invalidate(`tasks:${user.id}`);
  return ok(data);
}

export async function setTaskStatus(
  input: SetTaskStatusInput,
): Promise<ActionResult> {
  const parsed = setTaskStatusSchema.safeParse(input);
  if (!parsed.success) return fail("That status isn't valid.");

  const user = await requireUser();
  const supabase = await createClient();

  // completed_at is maintained by the sync_task_completed_at trigger.
  const { error } = await supabase
    .from("tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  invalidate(`tasks:${user.id}`);
  return ok();
}

export async function deleteTask(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) return fail("That task isn't valid.");

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return fail(toUserMessage(error));

  invalidate(`tasks:${user.id}`);
  return ok();
}
