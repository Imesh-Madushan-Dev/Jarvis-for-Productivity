import { refresh, updateTag } from "next/cache";

/**
 * updateTag expires the tag with read-your-own-writes semantics (revalidateTag
 * would only mark it stale). refresh() is the other half: our reads use
 * `use cache: private`, which lives in the browser's memory, and updateTag has
 * no reach into that. Skip it and a mutation looks like it silently reverted.
 *
 * Both are Server-Action-only. The agent calls the same actions from a route
 * handler, where they throw — so failure is swallowed and the assistant panel
 * calls router.refresh() once its stream ends instead.
 */
export function invalidate(tag: string) {
  try {
    updateTag(tag);
    refresh();
  } catch {
    // Not in a Server Action. See above.
  }
}
