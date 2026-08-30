/**
 * Self-check for the calendar date math. Run: `bun lib/day.check.ts`
 *
 * The anchor trick (rebuilding YYYY-MM-DD from components at local noon) is
 * what keeps week/month boundaries correct on a server in any timezone. That
 * is easy to break and impossible to see in the UI, so it gets asserts.
 */
import assert from "node:assert/strict";

import {
  dayOfInstant,
  formatWeekTitle,
  monthDays,
  rangeForDays,
  todayInZone,
  weekDays,
  zonedHours,
} from "./day";

// 2026-08-30 is a Sunday.
const SUNDAY = "2026-08-30";

// --- weeks start on Monday and contain the reference day -------------------
const week = weekDays(SUNDAY);
assert.equal(week.length, 7);
assert.equal(week[0], "2026-08-24", "week starts Monday");
assert.equal(week[6], SUNDAY, "week ends Sunday");
assert.ok(week.includes(SUNDAY));

// A Monday resolves to its own week, not the previous one.
assert.equal(weekDays("2026-08-24")[0], "2026-08-24");

// --- month grids are whole weeks -------------------------------------------
const month = monthDays(SUNDAY);
assert.equal(month.length % 7, 0, "month grid is whole weeks");
assert.equal(month[0], "2026-07-27", "grid starts on the Monday before the 1st");
assert.equal(month.at(-1), "2026-09-06", "grid ends on the Sunday after the end");
assert.ok(month.includes("2026-08-01") && month.includes("2026-08-31"));

// Every day in August must appear exactly once.
const august = month.filter((day) => day.startsWith("2026-08"));
assert.equal(august.length, 31, "all 31 August days present");
assert.equal(new Set(august).size, 31, "no duplicates");

// --- ranges bound the grid -------------------------------------------------
const range = rangeForDays(week, "UTC");
assert.ok(range.start < range.end, "range is ordered");
assert.ok(range.start.startsWith("2026-08-24"), "range opens on the first day");

// A zone ahead of UTC opens the window earlier in UTC terms.
const kolkata = rangeForDays(week, "Asia/Kolkata");
assert.ok(kolkata.start < range.start, "positive offset shifts the window back");

// --- instants land in the right local day ----------------------------------
// 19:00 UTC is already the next day in Kolkata (+05:30).
assert.equal(dayOfInstant("2026-08-30T19:00:00Z", "UTC"), "2026-08-30");
assert.equal(dayOfInstant("2026-08-30T19:00:00Z", "Asia/Kolkata"), "2026-08-31");

// todayInZone and dayOfInstant must agree — grids bucket with one, key on the other.
const instant = new Date("2026-08-30T19:00:00Z");
assert.equal(
  dayOfInstant(instant.toISOString(), "Asia/Kolkata"),
  todayInZone("Asia/Kolkata", instant),
);

// --- fractional hours ------------------------------------------------------
assert.equal(zonedHours("2026-08-30T09:30:00Z", "UTC"), 9.5);
assert.equal(zonedHours("2026-08-30T00:00:00Z", "Asia/Kolkata"), 5.5);

// --- titles ----------------------------------------------------------------
assert.equal(formatWeekTitle(week), "Aug 24 – 30");
assert.equal(
  formatWeekTitle(weekDays("2026-09-01")),
  "Aug 31 – Sep 6",
  "a week spanning two months names both",
);

console.log("day.ts calendar math: all checks passed");
