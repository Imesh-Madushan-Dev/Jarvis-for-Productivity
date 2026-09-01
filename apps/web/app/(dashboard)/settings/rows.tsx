import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The row language every settings section is assembled from: a label on the
 * left, its control on the right, hairline between rows. One shape everywhere,
 * so the same setting doesn't look like a different kind of thing depending on
 * which section it lives in.
 */

/** A heading above a group. `Profile`, `Appearance`, `Account`. */
export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-1 flex items-end justify-between gap-4 pt-8 first:pt-0">
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** A hairline-separated stack of rows. */
export function RowGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("divide-y divide-border", className)}>{children}</div>;
}

export function Row({
  label,
  description,
  htmlFor,
  hint,
  stacked = false,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  /** Set when the control is a single labellable input. */
  htmlFor?: string;
  /** Below the control - a character count, an error, a warning. */
  hint?: ReactNode;
  /** Control takes the full width under the label: textareas, tables. */
  stacked?: boolean;
  children: ReactNode;
}) {
  const Label = htmlFor ? "label" : "div";

  return (
    <div className={cn("py-4", stacked ? "space-y-3" : "sm:flex sm:items-center sm:gap-6")}>
      <Label
        {...(htmlFor ? { htmlFor } : {})}
        className={cn("block min-w-0", stacked ? undefined : "flex-1")}
      >
        <span className="block text-sm">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </Label>

      <div className={cn("min-w-0", stacked ? undefined : "mt-2 w-full sm:mt-0 sm:w-60 sm:shrink-0")}>
        {children}
        {hint ? <div className="mt-1.5 text-xs">{hint}</div> : null}
      </div>
    </div>
  );
}

/** Save bar, sticky to the bottom of the scrolling panel. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-8 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}
