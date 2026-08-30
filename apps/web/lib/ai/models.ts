import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ModelTier = "fast" | "standard" | "thinking";

/** Provider options cross the wire as JSON, so `unknown` won't do. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ModelDef = {
  id: string;
  label: string;
  provider: "anthropic" | "google" | "openai";
  envKey: string;
  tier: ModelTier;
  /** Passed straight to the provider. `includeThoughts` / `display` are what
   *  make reasoning stream back, which the assistant panel shows under
   *  "Thought process". */
  providerOptions?: Record<string, Record<string, JsonValue>>;
};

/**
 * The only place model ids appear. Provider ids move fast, so if one 404s, fix
 * it here and nowhere else.
 *
 * Gemini ids verified against ai.google.dev/gemini-api/docs/models.
 * The OpenAI id is NOT verified — confirm before relying on it.
 *
 * A model is offered in the UI only when its provider key is in the
 * environment; no point listing something that cannot run.
 */
export const MODELS: ModelDef[] = [
  {
    id: "claude-opus-5",
    label: "Opus 5",
    provider: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    tier: "thinking",
    providerOptions: {
      // 'adaptive' lets the model decide how long to think; summarised so the
      // panel has something readable to show.
      anthropic: { thinking: { type: "adaptive", display: "summarized" } },
    },
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    provider: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    tier: "standard",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Haiku 4.5",
    provider: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    tier: "fast",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    provider: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    tier: "thinking",
    providerOptions: {
      google: {
        thinkingConfig: { thinkingLevel: "high", includeThoughts: true },
      },
    },
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    provider: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    tier: "standard",
    providerOptions: {
      google: {
        thinkingConfig: { thinkingLevel: "low", includeThoughts: true },
      },
    },
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    provider: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    tier: "fast",
    providerOptions: {
      // Cheapest tier still reasons a little; thoughts stay off to keep it snappy.
      google: { thinkingConfig: { thinkingLevel: "minimal" } },
    },
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    provider: "openai",
    envKey: "OPENAI_API_KEY",
    tier: "standard",
  },
];

export type ModelInfo = {
  id: string;
  label: string;
  tier: ModelTier;
  available: boolean;
};

/** Server-only: reads the env to decide what is actually usable. */
export function availableModels(): ModelInfo[] {
  return MODELS.map((model) => ({
    id: model.id,
    label: model.label,
    tier: model.tier,
    available: Boolean(process.env[model.envKey]),
  }));
}

function find(id: string): ModelDef | undefined {
  return MODELS.find((candidate) => candidate.id === id);
}

/**
 * The client's model id comes from localStorage, so it can name a model that
 * was since renamed or whose key was revoked. Fall back rather than 500.
 */
export function resolveModelIdOrDefault(id: string | undefined): string | null {
  const model = id ? find(id) : undefined;
  if (model && process.env[model.envKey]) return model.id;
  return defaultModelId();
}

export function isModelUsable(id: string): boolean {
  const model = find(id);
  return Boolean(model && process.env[model.envKey]);
}

export function resolveModel(id: string): LanguageModel {
  const model = find(id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  if (!process.env[model.envKey]) {
    throw new Error(`${model.label} needs ${model.envKey} in the environment.`);
  }

  switch (model.provider) {
    case "anthropic":
      return anthropic(model.id);
    case "google":
      return google(model.id);
    case "openai":
      return openai(model.id);
  }
}

export function modelProviderOptions(id: string) {
  return find(id)?.providerOptions;
}

export function defaultModelId(): string | null {
  return availableModels().find((model) => model.available)?.id ?? null;
}
