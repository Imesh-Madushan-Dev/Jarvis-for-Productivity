import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];

/** Only the columns the dashboard renders — every extra column is egress. */
export const TASK_COLUMNS =
  "id,title,status,planned_date,planned_minutes,position,project_id,completed_at" as const;

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  planned_date: string | null;
  planned_minutes: number | null;
  position: number;
  project_id: string | null;
  completed_at: string | null;
  projects: { name: string } | null;
};

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(500),
  plannedDate: z.iso.date().nullish(),
  plannedMinutes: z.number().int().positive().max(1440).nullish(),
  projectId: z.uuid().nullish(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const setTaskStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["todo", "doing", "done"]),
});
export type SetTaskStatusInput = z.infer<typeof setTaskStatusSchema>;

export const deleteTaskSchema = z.object({ id: z.uuid() });
