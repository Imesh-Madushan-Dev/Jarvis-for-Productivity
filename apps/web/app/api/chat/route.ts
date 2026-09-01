import { createAgentUIStreamResponse } from "ai";
import { z } from "zod";

import { createMolyAgent } from "@/lib/ai/agent";
import { buildAwareness } from "@/lib/ai/context";
import type { AssistantErrorCode } from "@/lib/ai/errors";
import { defaultModelId, resolveModelIdOrDefault } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";
import { saveThread } from "@/modules/assistant/queries";

// No `runtime` export: Cache Components rejects the route segment config, and
// Node is the default for route handlers anyway. Tool loops plus provider
// round trips need the longer budget.
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  threadId: z.uuid(),
  modelId: z.string().optional(),
  pathname: z.string().default("/"),
});

/** The client maps `code` to copy; `message` is for logs, not for humans. */
function fail(code: AssistantErrorCode, status: number, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A route handler returns 401 rather than redirecting like requireUser does.
  if (!user) {
    return fail("unauthorized", 401, "No session");
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("bad_request", 400, "Body failed validation");
  }

  if (!defaultModelId()) {
    return fail("no_model", 501, "No provider key present");
  }

  // Falls back when the client's stored id names a renamed or unkeyed model.
  const modelId = resolveModelIdOrDefault(parsed.data.modelId);
  if (!modelId) {
    return fail("model_unavailable", 409, "Requested model has no key");
  }

  try {
    const awareness = await buildAwareness(user.id, parsed.data.pathname);

    return createAgentUIStreamResponse({
      agent: createMolyAgent({
        modelId,
        userId: user.id,
        awareness: awareness.text,
      }),
      uiMessages: parsed.data.messages,
      // `messages` is the whole conversation including the response, so the
      // thread is persisted in one upsert. A failure here must not break the
      // reply the user is already reading.
      onEnd: async ({ messages }) => {
        try {
          await saveThread({
            userId: user.id,
            threadId: parsed.data.threadId,
            messages,
          });
        } catch (error) {
          console.error("[assistant] could not save thread", error);
        }
      },
      // Returns the message the client receives, so a mid-stream failure gets
      // the same coded shape as the pre-stream ones above rather than the
      // SDK's opaque default. The real error stays in the server log.
      onError: (error) => {
        console.error("[assistant] stream failed", error);
        return JSON.stringify({
          error: { code: "provider_error", message: "Stream failed" },
        });
      },
    });
  } catch (error) {
    console.error("[assistant] could not start", error);
    return fail(
      "provider_error",
      502,
      error instanceof Error ? error.message : "Unknown provider failure",
    );
  }
}
