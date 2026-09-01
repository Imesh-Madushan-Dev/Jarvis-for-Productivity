/**
 * Self-check for the money math. Run: `bun modules/finance/finance.check.ts`
 *
 * Amounts and month boundaries are the two places a silent off-by-one costs
 * real money, so they get asserts.
 */
import assert from "node:assert/strict";

import {
  createTransactionSchema,
  createTransactionToolSchema,
  summarize,
  setWalletBalanceSchema,
  formatMoney,
  monthBounds,
  shiftMonth,
  type TransactionListItem,
} from "./schema";

const cents = (input: string | number) =>
  createTransactionSchema.parse({
    kind: "expense",
    amount: input,
    occurredOn: "2026-09-01",
  }).amount;

// --- decimal strings become exact minor units ------------------------------
assert.equal(cents("12.50"), 1250);
assert.equal(cents("0.1"), 10);
assert.equal(cents(0.1 + 0.2), 30, "float slop is rounded away, not stored");
assert.equal(cents("1,234.56"), 123456, "thousands separators are tolerated");
assert.equal(cents(19.99), 1999);

for (const bad of ["0", "-5", "abc", ""]) {
  assert.equal(
    createTransactionSchema.safeParse({
      kind: "expense",
      amount: bad,
      occurredOn: "2026-09-01",
    }).success,
    false,
    `${JSON.stringify(bad)} must be rejected`,
  );
}

// --- a tool's input must survive being parsed by the action as well ---------
// The AI SDK parses tool input, then the action parses it again. If the tool
// schema converted to cents, that second parse would multiply by 100 twice.
const fromTool = createTransactionToolSchema.parse({
  kind: "expense",
  amount: "1000",
  occurredOn: "2026-09-01",
});
assert.equal(fromTool.amount, "1000", "tool input keeps the amount as typed");
assert.equal(createTransactionSchema.parse(fromTool).amount, 100000);

// --- a balance, unlike an amount, may be zero or negative -------------------
const balance = (input: string | number) =>
  setWalletBalanceSchema.parse({ balance: input }).balance;
assert.equal(balance("0"), 0);
assert.equal(balance("-250.75"), -25075);
assert.equal(balance("23,828.68"), 2382868);
assert.equal(setWalletBalanceSchema.safeParse({ balance: "abc" }).success, false);

// --- month math wraps years ------------------------------------------------
assert.equal(shiftMonth("2026-12", 1), "2027-01");
assert.equal(shiftMonth("2026-01", -1), "2025-12");
assert.equal(shiftMonth("2026-09", 0), "2026-09");
assert.deepEqual(monthBounds("2026-12"), {
  from: "2026-12-01",
  to: "2027-01-01",
});
// The window is half-open, so the last day of the month is inside it and the
// first of the next is not.
const { from, to } = monthBounds("2026-02");
assert.ok("2026-02-28" >= from && "2026-02-28" < to);
assert.ok(!("2026-03-01" < to));

// --- totals ----------------------------------------------------------------
const rows: TransactionListItem[] = [
  { id: "a", kind: "income", amount_cents: 500_00, occurred_on: "2026-09-01", note: "", category_id: "cat" },
  { id: "b", kind: "expense", amount_cents: 120_50, occurred_on: "2026-09-02", note: "", category_id: "cat" },
  { id: "c", kind: "expense", amount_cents: 79_50, occurred_on: "2026-09-03", note: "", category_id: null },
];
const summary = summarize(rows);
assert.equal(summary.income, 50000);
assert.equal(summary.expense, 20000);
assert.equal(summary.net, 30000);
assert.equal(summary.byCategory.get("cat"), 500_00 + 120_50);
assert.equal(summary.byCategory.get("uncategorized"), 7950);

// --- formatting ------------------------------------------------------------
assert.ok(formatMoney(1250, "USD").includes("12.50"));
assert.ok(
  formatMoney(1200_00, "USD").includes("1,200.00"),
  "whole amounts still show cents",
);

console.log("finance math: all checks passed");
