import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * The only place model ids appear. Provider ids move faster than any codebase,
 * so if one 404s, fix it here and nowhere else.
 *
 * A model is offered in the UI only when its provider key is present in the
 * environment — no point listing something that cannot run.
 */
export const MODELS = [
  {
    id: "claude-opus-5",
    label: "Opus 5",
    provider: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    tier: "thinking",
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
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    tier: "thinking",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    tier: "fast",
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    provider: "openai",
    envKey: "OPENAI_API_KEY",
    tier: "standard",
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];
export type ModelTier = (typeof MODELS)[number]["tier"];
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

export function resolveModel(id: string): LanguageModel {
  const model = MODELS.find((candidate) => candidate.id === id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  if (!process.env[model.envKey]) {
    throw new Error(
      `${model.label} needs ${model.envKey} in the environment.`,
    );
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

export function defaultModelId(): string | null {
  return availableModels().find((model) => model.available)?.id ?? null;
}
