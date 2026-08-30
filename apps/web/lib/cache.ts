import { refresh, updateTag } from "next/cache";

/**
 * Server Actions only.
 *
 * updateTag expires the tag with read-your-own-writes semantics (revalidateTag
 * would only mark it stale). refresh() is the other half: our reads use
 * `use cache: private`, which lives in the browser's memory, and updateTag has
 * no reach into that. Skip it and a mutation looks like it silently reverted.
 */
export function invalidate(tag: string) {
  updateTag(tag);
  refresh();
}
