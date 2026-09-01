"use client";

import { useCallback, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { SECTIONS, type Section, type SectionId } from "./sections";

const GROUPS = ["Workspace", "Account"] as const;

/**
 * Rail on the left, one panel on the right.
 *
 * Every section's markup is already on the client, so switching is local state
 * plus a `replaceState` — a route push would re-render the tree to show markup
 * the browser is holding. `?tab=` still opens the right panel on a deep link.
 *
 * ponytail: no search box over three sections. Add one back if the rail ever
 * grows past a screenful.
 */
export function SettingsPanels({
  initialSection,
  panels,
  deepLink = true,
  framed = true,
}: {
  initialSection: SectionId;
  panels: Record<SectionId, ReactNode>;
  /** False inside the dialog: the URL belongs to the page underneath. */
  deepLink?: boolean;
  /** False inside the dialog, which is already a card — no nested chrome. */
  framed?: boolean;
}) {
  const [section, setSection] = useState<SectionId>(initialSection);

  const open = useCallback(
    (next: SectionId) => {
      setSection(next);
      if (deepLink) {
        window.history.replaceState(null, "", `/settings?tab=${next}`);
      }
    },
    [deepLink],
  );

  const active = SECTIONS.find((s) => s.id === section);

  return (
    <div
      className={cn(
        "grid gap-4 md:grid-cols-[13.5rem_1fr] md:gap-0",
        framed &&
          "overflow-hidden rounded-2xl border border-border bg-card",
      )}
    >
      {/* Rail. A horizontal strip on phones, a column from md up. */}
      <nav
        aria-label="Settings sections"
        className={cn(
          "flex gap-3 overflow-x-auto border-b border-border p-3 md:flex-col md:gap-4 md:overflow-x-visible md:border-r md:border-b-0",
          framed && "bg-muted/40",
        )}
      >
        {GROUPS.map((group) => {
          const items = SECTIONS.filter((s) => s.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="shrink-0 md:shrink">
              <div className="hidden px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground md:block">
                {group}
              </div>
              <ul className="flex gap-1 md:flex-col">
                {items.map((item) => (
                  <RailItem
                    key={item.id}
                    item={item}
                    active={item.id === section}
                    onSelect={() => open(item.id)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Panel. `key` remounts on switch, so a half-typed form in one section
          never bleeds into the next. */}
      <div key={section} className="t-rise min-w-0 px-4 py-5 sm:px-6 sm:py-6">
        <h2 className="sr-only">{active?.label}</h2>
        {panels[section]}
      </div>
    </div>
  );
}

function RailItem({
  item,
  active,
  onSelect,
}: {
  item: Section;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          "t-press flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors",
          active
            ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border [&_svg]:text-primary"
            : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
        )}
      >
        <HugeiconsIcon icon={item.icon} className="size-4 shrink-0" />
        {item.label}
      </button>
    </li>
  );
}
