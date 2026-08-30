"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { updateProfile } from "@/modules/profile/actions";

import { PanelFooter, PanelHeading, Row, RowGroup } from "../rows";

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

export function GeneralSection({
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
    <form onSubmit={submit}>
      <PanelHeading
        title="Profile"
        description="How you're addressed, and which clock the dashboard reads."
      />

      <RowGroup>
        <Row
          label="Display name"
          description="Used in the dashboard greeting."
          htmlFor="settings-display-name"
        >
          <Input
            id="settings-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            maxLength={80}
          />
        </Row>

        <Row
          label="Timezone"
          description="Decides which day the dashboard treats as today."
          htmlFor="settings-timezone"
          hint={
            timezone !== device ? (
              <button
                type="button"
                onClick={() => setTimezone(device)}
                className="t-press text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Use this device&apos;s timezone ({device})
              </button>
            ) : null
          }
        >
          <NativeSelect
            id="settings-timezone"
            className="w-full"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {options.map((zone) => (
              <NativeSelectOption key={zone} value={zone}>
                {zone}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Row>
      </RowGroup>

      <PanelFooter>
        {error ? (
          <p role="alert" className="mr-auto text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {status ? (
          <p role="status" className="mr-auto text-xs text-muted-foreground">
            {status}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="t-press">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </PanelFooter>
    </form>
  );
}
