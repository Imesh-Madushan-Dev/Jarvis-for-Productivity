import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

import { cn } from "@/lib/utils";

export type GlanceTile = {
  label: string;
  value: string;
  hint?: string;
  href: string;
  icon: IconSvgElement;
  /** Only money uses tone. Everything else stays on the neutral tokens. */
  tone?: "positive" | "negative";
};

/**
 * The four numbers worth knowing before you've read anything: what's left
 * today, what's next, what's in the wallet, whether today has been written
 * down. Each one is a link, because a number you can't act on is decoration.
 */
export function GlanceStrip({ tiles }: { tiles: GlanceTile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className="t-lift group rounded-2xl border border-border bg-card p-4 hover:border-muted-foreground/40"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={tile.icon} className="size-3.5" />
            {tile.label}
          </div>
          <p
            className={cn(
              "mt-2 truncate text-xl font-semibold tracking-tight tabular-nums",
              tile.tone === "positive" &&
                "text-emerald-600 dark:text-emerald-400",
              tile.tone === "negative" && "text-rose-600 dark:text-rose-400",
            )}
          >
            {tile.value}
          </p>
          {tile.hint ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {tile.hint}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
