export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/** Postgres/PostgREST errors are never shown raw to a user. */
export function toUserMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "23505":
      return "That already exists.";
    case "23514":
    case "22001":
      return "Some of those details aren't valid.";
    case "23503":
      return "That's linked to something that no longer exists.";
    case "42501":
      return "You don't have access to that.";
    case "PGRST116":
      return "We couldn't find that.";
    default:
      return "Something went wrong. Please try again.";
  }
}
