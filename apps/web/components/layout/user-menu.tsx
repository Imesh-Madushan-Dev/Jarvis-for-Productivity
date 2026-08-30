"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { LogoutSquare01Icon } from "@hugeicons/core-free-icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/lib/auth-actions";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function UserMenu({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-1 py-1">
      <Avatar className="size-7 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-xs">
          {initials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>

      <div className="flex items-center group-data-[collapsible=icon]:hidden">
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="t-press grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <HugeiconsIcon icon={LogoutSquare01Icon} className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
