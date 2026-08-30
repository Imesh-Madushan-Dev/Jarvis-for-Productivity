import { createAgentUIStreamResponse } from "ai";
import { z } from "zod";

import { createMolyAgent } from "@/lib/ai/agent";
import { buildAwareness } from "@/lib/ai/context";
import { defaultModelId } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";

// Tool loops and provider round trips outlive the edge budget.
export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  modelId: z.string().optional(),
  pathname: z.string().default("/"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A route handler returns 401 rather than redirecting like requireUser does.
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }

  const modelId = parsed.data.modelId ?? defaultModelId();
  if (!modelId) {
    return new Response(
      "No model is configured. Add ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY to .env.local.",
      { status: 501 },
    );
  }

  const awareness = await buildAwareness(user.id, parsed.data.pathname);

  try {
    return createAgentUIStreamResponse({
      agent: createMolyAgent({
        modelId,
        userId: user.id,
        awareness: awareness.text,
      }),
      uiMessages: parsed.data.messages,
    });
  } catch (error) {
    // Almost always a missing or rejected provider key.
    return new Response(
      error instanceof Error ? error.message : "The assistant is unavailable.",
      { status: 502 },
    );
  }
}
