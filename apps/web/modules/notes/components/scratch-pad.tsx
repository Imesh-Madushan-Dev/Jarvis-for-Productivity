"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { saveScratchPad } from "../actions";

const SAVE_DEBOUNCE_MS = 800;

type Status = "idle" | "saving" | "saved" | "error";

export function ScratchPad({ initialBody }: { initialBody: string }) {
  // The local copy is crash recovery for unsaved keystrokes; if one exists it
  // wins, because it is strictly newer than what the server last stored.
  const { value: body, setValue: setBody } = useLocalStorage(
    "moly.scratchpad.draft",
    initialBody,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onChange(next: string) {
    setBody(next);
    setStatus("saving");

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await saveScratchPad({ body: next });
        setStatus(result.ok ? "saved" : "error");
      });
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <section
      aria-labelledby="scratch-heading"
      className="flex min-h-[18rem] flex-col rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="scratch-heading" className="text-base font-medium">
          Scratch Pad
        </h2>
        <span
          aria-live="polite"
          className="text-xs text-muted-foreground transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : status === "error"
                ? "Couldn't save - retrying on next edit"
                : ""}
        </span>
      </div>

      <textarea
        value={body}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Anything you don't want to file yet…"
        aria-label="Scratch pad"
        className="mt-4 flex-1 resize-none bg-transparent text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </section>
  );
}
