# Moly

**A personal assistant that actually has your data.**

Moly is a self-hosted daily planner — tasks, calendar, money, notes, a journal —
with an agent sitting on top of it that can read and change every one of them.
Not a chat window bolted onto a CRUD app: the same Zod schemas that validate the
forms are the agent's tool schemas, and the same server actions do the writes.

```
"I paid 11,000 for the gym today"      → an expense, filed under Health
"what did I say about the knee thing"  → the journal entry from three weeks ago
"remind me to call the dentist at 6"   → a task, and a push notification at 6
```

Built for one person to run for themselves. Bring your own model API key.

---

## What's in it

| | |
| --- | --- |
| **Tasks** | Day plan, inline add, optimistic everything |
| **Calendar** | Day / week / month, timezone-correct, reminders drawn beside events |
| **Money** | Income and expenses in integer minor units, per-category accents, wallet balance |
| **Notes** | Cards plus an autosaving scratch pad |
| **Journal** | Typed or spoken; voice is recorded, uploaded and transcribed |
| **Reminders** | Web Push, delivered even when the app is closed |
| **Assistant** | Any model with a key. Reads your day, writes to every module, remembers |

### The parts worth stealing

**One `recall` tool, four sources.** Journal, notes, tasks and events are
`UNION ALL`ed straight from their own GIN-indexed tables — no mirror table, no
sync triggers, nothing that can go stale — and fused with **Reciprocal Rank
Fusion** over three signals: words (all sources), meaning (pgvector, where text
is fuzzy), recency (applied only to what already matched). Snippets are trimmed
to 300 characters *in Postgres*, so nothing is fetched that would only be
thrown away.

**Writes are optimistic, always.** The component holding a list holds the
`useOptimistic` reducer, and everything derived from it — totals, charts,
balances — moves in the same frame. Dialogs close on submit, not on the
server's answer. React drops optimistic values when the transition settles, so
a rejected write reverts itself.

**Context is today only.** The block prepended to every message carries ids
without bodies and sums without rows. Anything older is one `recall` away —
a round trip when it's needed, rather than a tax on every message.

---

## Stack

- **Next.js 16** (App Router, Cache Components, `use cache: private`) and **React 19**
- **Supabase** — Postgres, Auth, Storage, RLS on every table
- **AI SDK v7** — `ToolLoopAgent`, streaming UI, Anthropic / Google / OpenAI
- **pgvector** + generated `tsvector` columns for retrieval
- **shadcn/ui on Base UI**, Tailwind v4, Hugeicons
- **Bun** workspaces

---

## Running it

You need [Bun](https://bun.sh), a [Supabase](https://supabase.com) project, and
at least one model API key.

```bash
git clone <your-fork> moly && cd moly
bun install
cp apps/web/.env.example apps/web/.env.local   # then fill it in
bun dev
```

### Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# At least one. Whichever keys exist decide which models the picker offers.
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=

# Reminders that arrive when the app is closed.
# bun -e "console.log(require('web-push').generateVAPIDKeys())"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
REMINDER_DISPATCH_SECRET=
SUPABASE_SERVICE_ROLE_KEY=      # scheduled reminder dispatch only
```

Everything optional degrades rather than breaks: no embedding key means search
falls back to full text, no VAPID keys means reminders stay in-app, no model key
means the assistant bar tells you which variable to set.

### Database

Eleven tables, all with RLS owner policies: `profiles`, `projects`, `tasks`,
`events`, `notes`, `categories`, `transactions`, `journal_entries`, `threads`,
`messages`, `push_subscriptions` — plus the `wallet_net` view and the `recall`
and `set_wallet_balance` functions.

> **RLS decides which rows, `GRANT` decides whether the role may touch the table
> at all.** Miss the second and every query fails `42501` no matter how correct
> the policies are. Ask me how I know.

---

## Layout

```
apps/web/
  app/(dashboard)/     routes: overview, tasks, calendar, finance, notes, journal, settings
  app/api/             chat (agent stream), journal/voice, reminders/dispatch
  modules/<feature>/   schema.ts → queries.ts → actions.ts → tools.ts → components/
  lib/ai/              agent, context, models, embeddings, recall, errors
  lib/supabase/        server / client / proxy clients, generated types
docs/                  CHECKLIST.md, REMINDERS.md
AGENTS.md              the house rules, enforced on every change
```

A feature is one folder. `schema.ts` holds the Zod contracts and the pure
helpers; `queries.ts` reads; `actions.ts` writes and is the trust boundary;
`tools.ts` is a thin wrapper that hands the same schemas to the agent.

---

## Conventions

The full set is in [`AGENTS.md`](AGENTS.md), and they are rules rather than
preferences. The short version:

- **Money is integer minor units.** `amount_cents`, one conversion, two decimals always.
- **Actions parse their own input.** They're a trust boundary; they can't assume a caller validated anything.
- **Tool schemas carry raw values.** The AI SDK parses tool input, then the action parses it again — a transforming Zod field applied twice once stored every agent-written amount 100× too large.
- **Skeletons stand in for a panel, never a page.** And never put a changing `key` on a Suspense boundary.
- **Colour carries data**, not decoration.
- **Non-trivial pure logic leaves one runnable check behind** — not a test framework:

```bash
bun apps/web/lib/day.check.ts                    # calendar date math, UTC+14 → UTC−11
bun apps/web/modules/finance/finance.check.ts    # money parsing, month boundaries
bun apps/web/modules/events/calendar.check.ts    # event/reminder merge
bun apps/web/modules/journal/journal.check.ts    # entry text, voice fallbacks
bunx tsc --noEmit --project apps/web
```

---

## Notes from the field

- **iPhone push needs an installed PWA.** Add to Home Screen, open it from there,
  then enable reminders in Settings. In a Safari tab, nothing ever fires.
- **Reminders while closed need a scheduler.** One `pg_cron` job hitting
  `/api/reminders/dispatch` — SQL in [`docs/REMINDERS.md`](docs/REMINDERS.md).
  Until then an open tab fires them.
- **Embedding and transcription send text to your model provider.** That includes
  journal entries. If that's not acceptable, leave the keys out: full-text search
  still works entirely inside Postgres.
- **`getClaims()` beats `getUser()`** — but only verifies locally once the project
  uses asymmetric JWT signing keys. Migrate them in the dashboard.

---

## Licence

MIT. It's your data and your keys.
