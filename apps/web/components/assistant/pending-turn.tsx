const LABEL = "Thinking…";

/**
 * The gap between pressing send and the first streamed token. Without this the
 * card extends into empty space and reads as broken.
 *
 * data-text duplicates the label because the shimmer's ::before layer masks the
 * gradient onto the same glyphs - keep the two in sync.
 */
export function PendingTurn() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="t-shimmer text-xs"
      data-text={LABEL}
    >
      {LABEL}
    </p>
  );
}
