"use client";

import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="t-press"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Both icons stay mounted so the swap can cross-fade. */}
      <span className="relative block size-4">
        <HugeiconsIcon
          icon={Sun03Icon}
          className="absolute inset-0 size-4 rotate-0 scale-100 opacity-100 transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] dark:-rotate-90 dark:scale-0 dark:opacity-0"
        />
        <HugeiconsIcon
          icon={Moon02Icon}
          className="absolute inset-0 size-4 rotate-90 scale-0 opacity-0 transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] dark:rotate-0 dark:scale-100 dark:opacity-100"
        />
      </span>
    </Button>
  );
}
