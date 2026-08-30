import { tool } from "ai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createTask, setTaskStatus } from "./actions";
import { createTaskSchema, setTaskStatusSchema, TASK_COLUMNS } from "./schema";

/**
 * The tools are deliberately thin: the same zod schema that validates the form
 * is the tool's input schema, and the same action does the write. If logic ever
 * appears in this file, it belongs in actions.ts instead.
 */
export function taskTools(userId: string) {
  return {
    createTask: tool({
      description:
        "Create a task. Use the user's today (given in context) for plannedDate unless they name another day.",
      inputSchema: createTaskSchema,
      execute: async (input) => {
        const result = await createTask(input);
        return result.ok
          ? { created: true, id: result.data.id }
          : { created: false, error: result.error };
      },
    }),

    setTaskStatus: tool({
      description:
        "Change a task's status. Use 'done' to complete it, 'todo' to reopen. Task ids are in context.",
      inputSchema: setTaskStatusSchema,
      execute: async (input) => {
        const result = await setTaskStatus(input);
        return result.ok
          ? { updated: true }
          : { updated: false, error: result.error };
      },
    }),

    listTasks: tool({
      description:
        "List the user's tasks for a specific date (YYYY-MM-DD). Only needed for days other than today, which is already in context.",
      inputSchema: z.object({ day: z.iso.date() }),
      execute: async ({ day }) => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("tasks")
          .select(TASK_COLUMNS)
          .eq("user_id", userId)
          .eq("planned_date", day)
          .order("position")
          .limit(100);

        if (error) return { error: "Could not read those tasks." };
        return { tasks: data ?? [] };
      },
    }),
  };
}
