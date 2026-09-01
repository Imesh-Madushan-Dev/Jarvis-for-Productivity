"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mic01Icon, StopIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

export type VoiceResult = {
  path: string;
  text: string;
  durationSeconds: number;
};

type Phase = "idle" | "recording" | "working";

/** webm/opus everywhere it exists; Safari only offers mp4. */
function pickMimeType() {
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Records, uploads, transcribes — and hands the result up. The composer owns
 * what happens next, because a transcript is just text someone can still edit
 * before it becomes an entry.
 */
export function VoiceRecorder({
  onResult,
  onError,
  disabled,
}: {
  onResult: (result: VoiceResult) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  // A live recorder holds the microphone open; losing this component without
  // stopping it leaves the browser's recording indicator on.
  useEffect(() => {
    return () => {
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function start() {
    onError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void upload(new Blob(chunks.current, { type: mimeType || "audio/webm" }));
      };

      media.start();
      recorder.current = media;
      setSeconds(0);
      setPhase("recording");
    } catch {
      onError("Microphone access was refused.");
      setPhase("idle");
    }
  }

  function stop() {
    setPhase("working");
    recorder.current?.stop();
    recorder.current = null;
  }

  async function upload(blob: Blob) {
    const body = new FormData();
    body.append("audio", blob, "note.webm");

    try {
      const response = await fetch("/api/journal/voice", {
        method: "POST",
        body,
      });
      const result = await response.json();

      if (!response.ok) {
        onError(
          result.error === "no_transcriber"
            ? "No transcription provider is configured."
            : "That recording couldn't be saved.",
        );
        return;
      }

      if (result.error === "transcription_failed") {
        onError("Saved the audio, but couldn't transcribe it — type it in.");
      }

      onResult({
        path: result.path,
        text: result.text ?? "",
        durationSeconds: result.durationSeconds ?? seconds,
      });
    } catch {
      onError("That recording couldn't be uploaded.");
    } finally {
      setPhase("idle");
      setSeconds(0);
    }
  }

  if (phase === "recording") {
    return (
      <button
        type="button"
        onClick={stop}
        className="t-press flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1.5 text-sm text-rose-600 dark:text-rose-400"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500/60" />
          <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
        </span>
        <span className="tabular-nums">{clock(seconds)}</span>
        <HugeiconsIcon icon={StopIcon} className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || phase === "working"}
      className={cn(
        "t-press flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm",
        "hover:bg-accent disabled:opacity-50",
      )}
    >
      <HugeiconsIcon icon={Mic01Icon} className="size-4" />
      {phase === "working" ? "Transcribing…" : "Record"}
    </button>
  );
}
