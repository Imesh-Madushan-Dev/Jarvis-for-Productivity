import { ToolLoopAgent, stepCountIs } from "ai";

import { eventTools } from "@/modules/events/tools";
import { financeTools } from "@/modules/finance/tools";
import { noteTools } from "@/modules/notes/tools";
import { taskTools } from "@/modules/tasks/tools";
import { modelProviderOptions, resolveModel } from "./models";

const SYSTEM = `You are Moly, a personal planning assistant embedded in the user's own dashboard.

You can change their data directly - creating tasks, notes, calendar events and money entries, and completing tasks - using the tools available to you. Act on clear requests rather than describing what they could do. If someone says "add a task to call the dentist", create it; don't ask which list.

Rules:
- Everything in <context> is already true. Never re-read it with a tool.
- Resolve relative dates ("tomorrow", "this afternoon") against the user's timezone and today's date from <context>.
- Ask a clarifying question only when a request is genuinely ambiguous in a way that would produce the wrong data. A missing detail with an obvious default is not ambiguity.
- After changing something, say plainly what changed in one or two sentences. No preamble, no bulleted summary of a single action.
- If a tool returns an error, tell the user what failed in plain language. Never show raw error codes.
- You cannot delete anything yet. If asked, say so and suggest they use the interface.`;

export function createMolyAgent({
  modelId,
  userId,
  awareness,
}: {
  modelId: string;
  userId: string;
  awareness: string;
}) {
  return new ToolLoopAgent({
    model: resolveModel(modelId),
    // Thinking budget / thought visibility, per model. See lib/ai/models.ts.
    providerOptions: modelProviderOptions(modelId),
    instructions: `${SYSTEM}\n\n<context>\n${awareness}\n</context>`,
    tools: {
      ...taskTools(userId),
      ...noteTools(),
      ...eventTools(),
      ...financeTools(userId),
    },
    // A planning request rarely needs more than a couple of tool calls; this is
    // a runaway guard, not a budget.
    stopWhen: stepCountIs(8),
  });
}
