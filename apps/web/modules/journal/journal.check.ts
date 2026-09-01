/**
 * Self-check for the journal's pure bits.
 * Run: `bun modules/journal/journal.check.ts`
 *
 * A voice entry stores its words in `transcript` and a typed one in `body`;
 * everything downstream — search results, the agent's snippets, the list —
 * reads through `entryText`, so that fallback is the thing worth pinning.
 */
import assert from "node:assert/strict";

import { createJournalEntrySchema, entryPreview, entryText } from "./schema";

assert.equal(entryText({ body: "Typed", transcript: "" }), "Typed");
assert.equal(entryText({ body: "", transcript: "Spoken" }), "Spoken");
// A typed body wins: it is what the person actually chose to keep.
assert.equal(entryText({ body: "Edited", transcript: "Raw" }), "Edited");
assert.equal(entryText({ body: "   ", transcript: "Spoken" }), "Spoken");

const long = "x".repeat(500);
const preview = entryPreview({ body: long, transcript: "" }, 100);
assert.equal(preview.length, 101, "truncated to the limit plus an ellipsis");
assert.ok(preview.endsWith("…"));
assert.equal(
  entryPreview({ body: "short", transcript: "" }, 100),
  "short",
  "short entries are left alone",
);

// An entry with neither words nor a transcript must never reach the database.
const empty = createJournalEntrySchema.parse({ day: "2026-09-02" });
assert.equal(entryText(empty), "");

const voice = createJournalEntrySchema.parse({
  day: "2026-09-02",
  source: "voice",
  transcript: "  said out loud  ",
  durationSeconds: 12,
});
assert.equal(voice.transcript, "said out loud");
assert.equal(voice.source, "voice");

assert.equal(
  createJournalEntrySchema.safeParse({ day: "02-09-2026" }).success,
  false,
  "the day must be YYYY-MM-DD",
);

console.log("journal: all checks passed");
