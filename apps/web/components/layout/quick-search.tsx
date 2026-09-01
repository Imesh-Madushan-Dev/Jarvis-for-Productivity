"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  DashboardSquare01Icon,
  LogoutSquare01Icon,
  Moon02Icon,
  Note01Icon,
  PieChart01Icon,
  Search01Icon,
  Settings02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { signOut } from "@/lib/auth-actions";

// Mirrors the sidebar's `ready: true` items — anything not built stays out of
// the palette too.
const DESTINATIONS = [
  { label: "Overview", href: "/", icon: DashboardSquare01Icon },
  { label: "Notes", href: "/notes", icon: Note01Icon },
  { label: "Calendar", href: "/calendar", icon: Calendar03Icon },
  { label: "Tasks", href: "/tasks", icon: CheckmarkCircle02Icon },
  { label: "Money", href: "/finance", icon: PieChart01Icon },
  { label: "Settings", href: "/settings", icon: Settings02Icon },
];

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) &&
        (event.key === "k" || event.key === "f");
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((current) => !current);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="t-press flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0" />
        <span className="flex-1 text-left">Quick Search</span>
        <Kbd>⌘F</Kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Quick search"
        description="Jump to a page or run a command"
      >
        {/* ponytail: commands only. Searching note and task *content* needs a
            real index — add it when there is enough content to lose. */}
        <CommandInput placeholder="Type a command…" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>
          <CommandGroup heading="Go to">
            {DESTINATIONS.map((destination) => (
              <CommandItem
                key={destination.href}
                onSelect={() => run(() => router.push(destination.href))}
              >
                <HugeiconsIcon icon={destination.icon} className="size-4" />
                {destination.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Preferences">
            <CommandItem
              onSelect={() =>
                run(() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark"),
                )
              }
            >
              <HugeiconsIcon
                icon={resolvedTheme === "dark" ? Sun03Icon : Moon02Icon}
                className="size-4"
              />
              Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
            </CommandItem>
            <CommandItem onSelect={() => run(() => void signOut())}>
              <HugeiconsIcon icon={LogoutSquare01Icon} className="size-4" />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
