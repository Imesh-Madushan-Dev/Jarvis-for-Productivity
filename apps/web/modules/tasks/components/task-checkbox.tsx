"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

// Path length of "M1 5.52L3.92 9.17L9.17 1" is ~14.39; round up so the stroke
// never under- or over-draws.
const CHECK_LEN = 15;

export function TaskCheckbox({
  checked,
  onToggle,
  label,
  className,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      style={{ "--check-len": CHECK_LEN } as CSSProperties}
      className={cn(
        "t-check t-press grid size-5 shrink-0 place-items-center rounded-full",
        "border border-muted-foreground/40 text-primary-foreground",
        "hover:border-muted-foreground/70",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "aria-checked:border-primary aria-checked:bg-primary",
        className,
      )}
    >
      <svg viewBox="0 0 10.1668 10.1668" className="size-3" aria-hidden="true">
        <path
          d="M1 5.52L3.92 9.17L9.17 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
