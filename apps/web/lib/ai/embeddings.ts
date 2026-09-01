import "server-only";

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

/**
 * One embedding space, 768 dimensions, whichever provider is available.
 *
 * Vectors from different models are not comparable, so every row records which
 * model produced it (`embedding_model`) and search only ever compares within
 * one space. Both providers below are asked for 768 dimensions so a switch is
 * a re-embed, not a migration.
 */
export const EMBEDDING_DIMENSIONS = 768;

type Embedder = {
  id: string;
  model: Parameters<typeof embed>[0]["model"];
  providerOptions: Record<string, Record<string, number | string>>;
};

function embedder(): Embedder | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      id: "google:gemini-embedding-001:768",
      model: google.textEmbedding("gemini-embedding-001"),
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      id: "openai:text-embedding-3-small:768",
      // Matryoshka: the model is trained so a truncated vector is still valid,
      // which is what lets both providers share one column.
      model: openai.textEmbedding("text-embedding-3-small"),
      providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
    };
  }

  return null;
}

export function embeddingModelId(): string | null {
  return embedder()?.id ?? null;
}

/** pgvector accepts the literal `[0.1,0.2,…]`; supabase-js sends it as text. */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export type EmbeddingResult = { model: string; vector: string } | null;

/**
 * Null rather than throwing when no provider key is present: journalling must
 * keep working without an embedding provider, just with weaker search. The
 * row is left unembedded and the backfill picks it up later.
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  const active = embedder();
  const value = text.trim();
  if (!active || !value) return null;

  try {
    const { embedding } = await embed({
      model: active.model,
      providerOptions: active.providerOptions,
      // Providers reject very long inputs; a journal entry is well under this,
      // and truncating beats failing the write.
      value: value.slice(0, 8000),
    });
    return { model: active.id, vector: toVectorLiteral(embedding) };
  } catch (error) {
    console.error("[embeddings] failed", error);
    return null;
  }
}

export async function embedBatch(
  texts: string[],
): Promise<{ model: string; vectors: string[] } | null> {
  const active = embedder();
  if (!active || texts.length === 0) return null;

  try {
    const { embeddings } = await embedMany({
      model: active.model,
      providerOptions: active.providerOptions,
      values: texts.map((text) => text.trim().slice(0, 8000)),
    });
    return { model: active.id, vectors: embeddings.map(toVectorLiteral) };
  } catch (error) {
    console.error("[embeddings] batch failed", error);
    return null;
  }
}
