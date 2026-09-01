<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Moly: how this app is built

Everything below is a rule, not a preference. New features match it; existing
code that does not is a bug to fix, not a precedent to copy.

## Writes are optimistic. Always.

A write must change the screen in the same frame the user acts, never a round
trip later. The database is remote — every await is a visible stall.

- **One client owner per surface.** The component holding the list holds a
  `useOptimistic` reducer, and everything derived from that list — totals,
  charts, counts, balances — is computed from the optimistic state, so one
  patch moves all of it at once. See `modules/finance/components/money-board.tsx`
  and `modules/notes/components/notes-board.tsx`.
- **Dialogs close on submit, not on the answer.** The dialog collects values
  and hands them to the owner; the owner fires the action. A dialog that
  `await`s an action before closing is wrong.
- **Optimistic ids are `pending-${crypto.randomUUID()}`** and exist only as
  React keys until the server's row replaces them.
- **Never hand-roll the rollback.** React drops optimistic values when the
  transition settles, so a rejected write reverts itself. The only thing left
  to do is show `result.error`.
- **No local list to patch?** (page-header dialogs, for instance) Close
  immediately anyway, keep what was typed, and reopen with the error if the
  write fails — see `components/layout/quick-create-dialog.tsx`.
- Validate anything that would make an optimistic row obviously wrong (an
  unparseable amount) *before* showing it. A row that appears and vanishes
  reads as a bug.

## Server actions and tools share schemas, never parsed values

Actions parse their own input with zod — they are a trust boundary and cannot
assume a caller validated anything. The AI SDK also parses tool input against
the tool's schema before calling `execute`. So a **transforming** field parsed
twice is applied twice: this stored every agent-written amount 100× too large.
Tool schemas therefore carry raw values (`createTransactionToolSchema`), and
the action does the one conversion. Any schema with a `.transform()` needs a
raw twin for tools.

## Skeletons stand in for a panel, never for the page

- Page chrome — title, description, toolbars — renders outside every Suspense
  boundary and never has a skeleton.
- Fallbacks match the shape of what is loading: rows for a list, cards for a
  card grid (`components/layout/skeletons.tsx`). A viewport-sized grey slab
  reads as a broken app.
- **Never put a changing `key` on a Suspense boundary** for something like a
  date or filter change. A new key is a new boundary, which forces the
  fallback; reusing it keeps the current content on screen until the next data
  arrives.

## Money is integer minor units

`amount_cents`, always. Never a float, never a decimal string past the schema
boundary. One conversion, in `modules/finance/schema.ts`. Money is always
formatted with two decimals.

## The rest

- Reads are narrow: named column lists, a row limit on every query, and one
  bounded window (a day, a month) rather than "everything".
- Aggregate in Postgres when the alternative is shipping rows to count them
  (`wallet_net`), and prefer one statement to read-then-write
  (`set_wallet_balance`).
- Every action returns `ActionResult` and a human message from
  `lib/result.ts` — a raw Postgres error never reaches a user.
- Colour carries data, not decoration: category accents, chart bars, income
  green / expense red. Surfaces stay on neutral tokens.
- Non-trivial pure logic leaves one runnable check behind
  (`bun modules/finance/finance.check.ts`, `bun lib/day.check.ts`), not a test
  framework.
