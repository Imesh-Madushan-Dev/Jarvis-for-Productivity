"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/modules/profile/actions";

// Intl.supportedValuesOf isn't in every TS lib target, and the browser already
// has the table — no reason to ship 400 strings in the RSC payload.
function timeZones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}

function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function SettingsForm({
  displayName: initialName,
  timezone: initialZone,
}: {
  displayName: string;
  timezone: string;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialZone);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const zones = timeZones();
  const device = deviceZone();
  // A stored zone the runtime doesn't list would otherwise vanish from the
  // select and silently reset on save.
  const options =
    zones.length === 0
      ? Array.from(new Set([timezone, device]))
      : zones.includes(timezone)
        ? zones
        : [timezone, ...zones];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    startTransition(async () => {
      const result = await updateProfile({ displayName, timezone });
      if (result.ok) setStatus("Saved.");
      else setError(result.error);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-5"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        Display name
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          maxLength={80}
        />
        <span className="text-xs text-muted-foreground">
          Used in the dashboard greeting.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Timezone
        <select
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="t-press h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {options.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Decides which day the dashboard treats as today.
        </span>
      </label>

      {timezone !== device ? (
        <button
          type="button"
          onClick={() => setTimezone(device)}
          className="t-press self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Use this device&apos;s timezone ({device})
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="t-press self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
