import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];

/** Only the columns the dashboard renders - every extra column is egress. */
export const TASK_COLUMNS =
  "id,title,body,status,planned_date,planned_minutes,position,project_id,completed_at,remind_at" as const;

export type TaskListItem = {
  id: string;
  title: string;
  /** The task description. Empty string, never null - the column is NOT NULL. */
  body: string;
  status: TaskStatus;
  planned_date: string | null;
  planned_minutes: number | null;
  position: number;
  project_id: string | null;
  completed_at: string | null;
  /** When to fire a notification for this task. Null means no reminder. */
  remind_at: string | null;
  projects: { name: string } | null;
};

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(500),
  /** Free-text description. */
  body: z.string().max(10_000).nullish(),
  plannedDate: z.iso.date().nullish(),
  plannedMinutes: z.number().int().positive().max(1440).nullish(),
  projectId: z.uuid().nullish(),
  /** A full ISO instant with an offset — resolved against the user's zone. */
  remindAt: z.iso.datetime({ offset: true }).nullish(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const setTaskStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["todo", "doing", "done"]),
});
export type SetTaskStatusInput = z.infer<typeof setTaskStatusSchema>;

export const setTaskReminderSchema = z.object({
  id: z.uuid(),
  /** Null clears the reminder. */
  remindAt: z.iso.datetime({ offset: true }).nullable(),
});
export type SetTaskReminderInput = z.infer<typeof setTaskReminderSchema>;

/**
 * Every field is optional but `id`: the edit dialog sends only what changed,
 * and `undefined` means "leave it alone" while `null` clears it.
 */
export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Give the task a title.").max(500).optional(),
  body: z.string().max(10_000).nullish(),
  plannedDate: z.iso.date().nullish(),
  remindAt: z.iso.datetime({ offset: true }).nullish(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const deleteTaskSchema = z.object({ id: z.uuid() });
