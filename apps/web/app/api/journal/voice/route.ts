import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";

import { createClient } from "@/lib/supabase/server";

// Transcription is a single upstream call, but a four-minute note is a slow one.
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
]);

function transcriber() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google.transcription("gemini-3.5-transcribe");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai.transcription("whisper-1");
  }
  return null;
}

/**
 * Audio in, transcript and a storage path out.
 *
 * The audio is uploaded from the server rather than the browser so the file is
 * checked — size, type, and a path that always begins with the caller's own id
 * — before it can land in the bucket. Storage RLS enforces the same rule; this
 * is the half that gives a useful error instead of a rejected upload.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const model = transcriber();
  if (!model) {
    return Response.json({ error: "no_transcriber" }, { status: 501 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) {
    return Response.json({ error: "no_audio" }, { status: 400 });
  }

  const type = file.type.split(";")[0];
  if (!ALLOWED.has(type)) {
    return Response.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = type.split("/")[1] ?? "webm";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("journal-audio")
    .upload(path, bytes, { contentType: type, upsert: false });

  if (uploadError) {
    console.error("[journal] upload failed", uploadError);
    return Response.json({ error: "upload_failed" }, { status: 500 });
  }

  try {
    const result = await transcribe({ model, audio: bytes });
    return Response.json({
      path,
      text: result.text.trim(),
      durationSeconds: Math.round(result.durationInSeconds ?? 0),
    });
  } catch (error) {
    console.error("[journal] transcription failed", error);
    // The recording is already stored, so the entry can still be saved and the
    // words typed in — losing the audio would be the worse outcome.
    return Response.json(
      { path, text: "", error: "transcription_failed" },
      { status: 200 },
    );
  }
}
