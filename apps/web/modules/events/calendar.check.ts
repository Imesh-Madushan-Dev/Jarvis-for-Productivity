/**
 * Self-check for the calendar item merge.
 * Run: `bun modules/events/calendar.check.ts`
 */
import assert from "node:assert/strict";

import { toCalendarItems } from "./schema";

const events = [
  {
    id: "e1",
    title: "Standup",
    starts_at: "2026-09-02T09:00:00Z",
    ends_at: "2026-09-02T09:15:00Z",
    all_day: false,
    location: null,
  },
];

const reminders = [
  { id: "t1", title: "Call the dentist", remind_at: "2026-09-02T08:00:00Z" },
  // A task with no reminder must never reach the calendar.
  { id: "t2", title: "Someday", remind_at: null },
];

const items = toCalendarItems(events, reminders);

assert.equal(items.length, 2, "tasks without a reminder are dropped");
assert.deepEqual(
  items.map((item) => item.id),
  ["task-t1", "event-e1"],
  "items are chronological, whichever table they came from",
);
assert.equal(items[0].kind, "reminder");
assert.equal(items[1].kind, "event");
// Ids are namespaced: a task and an event can share a uuid.
assert.ok(items.every((item) => /^(task|event)-/.test(item.id)));

console.log("calendar item merge: all checks passed");
