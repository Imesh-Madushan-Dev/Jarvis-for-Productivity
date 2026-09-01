export type AssistantErrorCode =
  | "unauthorized"
  | "bad_request"
  | "no_model"
  | "model_unavailable"
  | "provider_error"
  | "offline"
  | "unknown";

export type AssistantErrorCopy = {
  title: string;
  detail: string;
  retryable: boolean;
};

/**
 * Same contract as lib/result.ts's toUserMessage: a code goes in, something a
 * person can act on comes out. The raw Error never reaches the screen.
 */
const COPY: Record<AssistantErrorCode, AssistantErrorCopy> = {
  unauthorized: {
    title: "Your session expired",
    detail: "Sign in again and your message will still be here.",
    retryable: false,
  },
  bad_request: {
    title: "That message couldn't be sent",
    detail: "Start a new chat and try again.",
    retryable: false,
  },
  no_model: {
    title: "No model is configured",
    detail:
      "Add ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY to .env.local, then restart the dev server.",
    retryable: false,
  },
  model_unavailable: {
    title: "That model isn't available",
    detail: "Its API key is missing. Pick another model from the menu.",
    retryable: false,
  },
  provider_error: {
    title: "The model provider rejected the request",
    detail: "Usually an invalid key, or you're out of quota.",
    retryable: true,
  },
  offline: {
    title: "You're offline",
    detail: "The assistant needs a connection. Your message is still here.",
    retryable: true,
  },
  unknown: {
    title: "The assistant stopped unexpectedly",
    detail: "Nothing was lost - try that again.",
    retryable: true,
  },
};

const CODES = Object.keys(COPY) as AssistantErrorCode[];

/**
 * useChat surfaces a failed response as an Error whose message is the raw body.
 * Ours is JSON; anything else (a proxy, a crash page) falls through to unknown.
 */
function parseCode(message: string): AssistantErrorCode {
  try {
    const body = JSON.parse(message) as { error?: { code?: string } };
    const code = body.error?.code;
    if (code && CODES.includes(code as AssistantErrorCode)) {
      return code as AssistantErrorCode;
    }
  } catch {
    // Not JSON - fall through.
  }
  return "unknown";
}

export function describeAssistantError(
  error: Error | undefined,
  isOffline: boolean,
): AssistantErrorCopy | null {
  if (!error) return null;
  // A dead connection explains every other symptom, so it wins.
  if (isOffline) return COPY.offline;
  return COPY[parseCode(error.message)];
}
