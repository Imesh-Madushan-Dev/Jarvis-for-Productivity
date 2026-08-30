"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";

import { PanelHeading, Row, RowGroup } from "../rows";

const THEMES = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  // The stored theme only exists on the client, so the first paint would
  // otherwise render a select whose value flips after hydration.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div>
      <PanelHeading
        title="Appearance"
        description="Saved in this browser — no changes are sent to your account."
      />

      <RowGroup>
        <Row
          label="Theme"
          description="Match system follows your OS setting as it changes."
          htmlFor="settings-theme"
        >
          {ready ? (
            <NativeSelect
              id="settings-theme"
              className="w-full"
              value={theme ?? "system"}
              onChange={(event) => setTheme(event.target.value)}
            >
              {THEMES.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <Skeleton className="h-9 w-full rounded-md" />
          )}
        </Row>
      </RowGroup>
    </div>
  );
}
