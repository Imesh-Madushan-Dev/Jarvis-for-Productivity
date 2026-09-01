# Dashboard Build Checklist

Overview dashboard, matching the reference UI. Feature-modular, agentic-first,
light + dark.

## 1. Database (Supabase MCP)
- [x] `profiles` / `projects` / `notes` / `tasks` / `events` tables
- [x] Enums: `task_status`, `note_kind`
- [x] Indexes on every query path the dashboard uses
- [x] `updated_at` + `completed_at` maintained by trigger
- [x] Profile auto-created on signup (`handle_new_user`)
- [x] RLS enabled + owner policies on all 5 tables, using `(select auth.uid())`
- [x] Functions hardened with `set search_path = ''`
- [x] `handle_new_user` EXECUTE revoked (was RPC-callable by `anon`)
- [x] **DML granted to `authenticated`** - tables shipped with only
      REFERENCES/TRIGGER/TRUNCATE, so every query failed 42501 regardless of RLS
- [x] Covering indexes on the `project_id` foreign keys
- [x] Security advisors: 0 errors
- [x] Generated TypeScript types checked in
- [ ] Leaked-password protection - **you must enable this** in the Supabase
      dashboard (Auth → Password security); not settable over MCP

## 2. Infrastructure
- [x] `.env.local` wired to the project (gitignored, `.env.example` committed)
- [x] `lib/supabase/{server,client,proxy}.ts` - `@supabase/ssr` getAll/setAll
- [x] `proxy.ts` refreshes the session + optimistic route guard
- [x] Email/password auth + login page (no account enumeration in errors)
- [x] `requireUser()` deduped with React `cache()` - 5 panels, 1 `getUser()`
- [x] `connection()` inside `requireUser` so the prerenderer tolerates
      supabase-js's internal `Date.now()`
- [x] Light **and** dark theme via next-themes, no flash
- [x] Brand tokens (`--brand`) defined in both themes

## 3. Feature modules (`modules/<feature>/`)
`schema.ts` (zod) → `queries.ts` (read) → `actions.ts` (write) → `components/`.
- [x] `modules/tasks`
- [x] `modules/notes` (note cards + scratch pad, one table, `kind` column)
- [x] `modules/events`
- [x] `modules/profile`
- [x] Shared `lib/result.ts` - every action returns `ActionResult`, never a raw
      Postgres error
- [x] `tools.ts` per module wrapping `actions.ts`, reusing the same zod schemas
      the forms validate against

## 4. Dashboard UI (reference parity)
- [x] App sidebar: user block, quick search, 2 nav groups, footer
- [x] Header: time-aware greeting, date, New Note / New Event / New Task
- [x] Notes: horizontal card rail, Recents / Suggested toggle
- [x] Calendar: hour strip, live current-time marker, positioned events
- [x] Tasks: checkbox list, strikethrough on done, inline add
- [x] Scratch Pad: debounced autosave with status
- [x] Overview redesigned around today: a four-tile glance strip (left today /
      up next / wallet / journal), then the day itself on the left and the
      modules that report on it down the right
- [x] Money and Journal snapshot cards - read-only by design; writing lives on
      the page that owns the optimistic list
- [x] Empty states for every panel
- [x] Responsive; each panel streams in its own Suspense boundary
- [x] Keyboard: ⌘K / ⌘F quick search
- [x] Dates are picked with the shadcn Calendar in a Popover
      (`components/form/date-field.tsx`), not the browser's native control;
      the value still travels in a hidden input so forms read `FormData`
- [x] Sidebar functional: ⌘B, rail drag-collapse, always-visible trigger,
      icon-collapse mode, mobile sheet, active-route highlight
- [x] `/notes`, `/calendar`, `/tasks`, `/settings` built and wired to the nav
- [x] Settings page edits display name + timezone (device-zone shortcut)
- [x] Command palette destinations mirror the sidebar's built routes
- [ ] Sidebar collapse state resets on reload. The provider writes the
      `sidebar_state` cookie, but reading it back needs `cookies()` in the
      layout, which would make the whole dashboard dynamic and cost the static
      shell that offline navigation depends on. Not worth the trade.
- [x] Week and Month calendar views, switched via `?view=` so the server picks
      the query window; one bounded query per view
- [x] Calendar date math covered by `lib/day.check.ts` (`bun lib/day.check.ts`),
      passing from UTC+14 to UTC-11
- [ ] Files / Templates / Notebook / Tags / Shared - no data model yet, so the
      nav items render disabled rather than as dead links

## 4b. Money (income / expense tracker)
- [x] `categories` + `transactions` tables, RLS owner policies, DML grants,
      indexes on `(user_id, occurred_on)` and the category FK
- [x] Amounts stored as integer minor units - never floats
- [x] `profiles.currency`, editable in Settings, used by every formatter
- [x] `/finance`: month in the URL (`?month=`), one bounded query per month,
      totals folded in a single pass
- [x] Add-entry and category management both live in dialogs, not on the page
- [x] Category management: create, recolour, archive (archived stay on old
      entries but stop being offered)
- [x] shadcn `Select` for category/kind; colour is chart-only - cards, chips
      and rows stay on neutral surface tokens
- [x] Optimistic delete with automatic revert; edit via the same dialog form
- [x] Wallet balance card (`profiles.opening_balance_cents` + the `wallet_net`
      view, aggregated in Postgres) - editable by hand and by the agent, and
      never written as a phantom adjusting transaction
- [x] Income green, spending red on the numbers only; surfaces stay neutral
- [x] Month switching reuses the Suspense boundary, so the page no longer
      flashes a skeleton on every arrow click
- [x] Agent tools: `createTransaction`, `updateTransaction`, `createCategory`,
      `setWalletBalance`, `monthlyMoneySummary`; categories, currency, balance
      and month-to-date totals are in `buildAwareness`
- [x] Money math covered by `modules/finance/finance.check.ts`
      (`bun modules/finance/finance.check.ts`)
- [ ] No budgets or recurring entries yet

## 4c. Reminders
- [x] `remind_at` + `reminded_at` on `tasks` and `events` — a reminder is a
      time on something you already have, not a fifth noun
- [x] Reminders appear in Tasks (bell + time) and on the calendar (day, week,
      month) as dashed pins beside events
- [x] `push_subscriptions` (owner-only RLS), service worker, VAPID keys
      generated into the gitignored `.env.local`
- [x] `/api/reminders/dispatch` claims due rows with one UPDATE, so overlapping
      runs cannot double-send; dead subscriptions are deleted on 404/410
- [x] Two callers: an open tab (its own user, once a minute, visible only) and
      the scheduler (service role, gated on `REMINDER_DISPATCH_SECRET`)
- [x] Settings -> Reminders: per-device enable, and "Send a test" that proves
      permission, subscription, keys and delivery in one click
- [x] Agent: `createTask({ remindAt })` and `setTaskReminder`; today's reminder
      times are in `buildAwareness`
- [x] `bun modules/events/calendar.check.ts` covers the event/reminder merge
- [ ] **You must add `SUPABASE_SERVICE_ROLE_KEY`** to `.env.local` and schedule
      the cron job once the app is deployed - see `docs/REMINDERS.md`
- [ ] No snooze, no recurrence, and no "remind me 10 minutes before" derived
      from an event's start yet

## 4d. Journal + memory
- [x] `journal_entries` (owner-only RLS, DML grants), text or voice, one row
      per entry with `day` as a DATE so a 1am entry stays on the right day
- [x] Full-text via a **generated** `tsvector` column + GIN - it cannot drift
      from the text it indexes
- [x] `pgvector` (768 dims) + HNSW cosine index; `embedding_model` recorded per
      row so vectors from different models are never compared
- [x] `search_journal()` fuses both with **Reciprocal Rank Fusion** (k=60),
      `security invoker` so RLS scopes it to the caller
- [x] Embedding is written **after** the row: a missing or rate-limited
      provider can never lose an entry, and `backfillEmbeddings` catches up
- [x] Voice: MediaRecorder -> `/api/journal/voice` -> private `journal-audio`
      bucket (owner-only storage policies, path prefixed with the user id) ->
      transcription; a failed transcription still keeps the audio
- [x] **One `recall` tool, four sources.** `recall()` UNIONs journal, notes,
      tasks and events straight from their own GIN-indexed tables - no mirror
      table, no triggers, nothing that can go stale - and fuses words, meaning
      and recency with RRF. Snippets are trimmed to 300 chars in Postgres, so
      nothing is fetched that would only be thrown away
- [x] Notes are embedded too (journal + notes have vectors; tasks and events
      compete on words, which is how people search a title anyway)
- [x] Context is today-only: ids without bodies, sums without rows, and the
      journal reduced to "last written <day>". Everything else is one recall
- [x] `bun modules/journal/journal.check.ts`
- [ ] Rolling weekly summaries and a distilled `memory_facts` store - the layer
      that turns retrieval into memory. Not built yet.
- [ ] No entry editing in the UI yet (the action exists), and no audio playback

## 5. Micro-interactions (transitions.dev tokens)
- [x] Motion token scale in `globals.css`; no component hardcodes a duration
- [x] `checkbox-check` installed verbatim - box fills, tick stroke-draws
- [x] `.t-press` on every button (scale on active, tokenised colour fades)
- [x] `.t-lift` on note cards and calendar events
- [x] `.t-rise` staggered mount reveal on headings
- [x] Theme toggle cross-fades sun/moon
- [x] `prefers-reduced-motion` guard on all of it
- [ ] `skeleton-reveal` - **deliberately skipped**: its two-layer class-swap
      model fights Suspense, which replaces DOM instead of toggling classes

## 6. Egress + web platform
- [x] Narrow column selects (`TASK_COLUMNS` etc.) instead of `select("*")`
- [x] Row limits on every list query
- [x] `use cache: private` + `cacheLife` on reads (browser-memory; helps soft
      navigation, not cold loads)
- [x] `invalidate()` = `updateTag` + `refresh` - `refresh` is required because
      the private cache lives in the browser
- [x] localStorage: scratch-pad crash recovery, notes tab, calendar view
- [x] PWA: manifest, icons, standalone, safe areas, offline retry

## 7. Ambient assistant
- [x] Floating bar, fixed bottom-centre, collapses to a pill
- [x] Chip row + input row matching the reference: history, action chips, a
      right-aligned create chip, model picker, attach, mic/send/stop
- [x] Model picker is a `DropdownMenu` radio group - tiers, checkmarks, and a
      "No key" badge on models whose provider key is missing
- [x] Tooltips on every icon button; `TooltipProvider` with a 300ms delay
- [x] Assistant turns collapse behind "Worked for Ns" (live counter while
      running), opening onto Thought process + tool lines
- [x] Panel: new chat, expand/shrink height, close
- [x] Streaming replies with a controlled `Collapsible` "Thought process" for
      reasoning parts, and per-tool-call progress lines
- [x] **Awareness**: every request carries the current pathname; the server
      builds context from the profile, today's tasks, today's events and recent
      notes (`lib/ai/context.ts`)
- [x] **Mutation**: `modules/*/tools.ts` wrap the same actions and the same zod
      schemas the forms use - createTask, setTaskStatus, listTasks, createNote,
      replaceScratchPad, createEvent
- [x] `ToolLoopAgent` with `stepCountIs(8)` as a runaway guard
- [x] Model list derived from which provider keys exist; unavailable models
      render disabled rather than failing at send time
- [x] Panel refreshes the RSC tree when a run finishes, so the dashboard
      reflects what the agent changed
- [ ] **No delete tool.** Destructive operations need the approval flow
      (`needsApproval` + `addToolApprovalResponse`), and shipping deletion
      without it is the wrong order. The agent is told to say so if asked.
- [x] **Conversation history**: `threads` + `messages` tables (RLS owner
      policies, DML grants). The chat route upserts the whole conversation in
      `onEnd`, so a thread is always exactly what the client holds. Parts are
      stored as the SDK's own `UIMessage` parts - no lossy `content` column
- [x] Full-screen mode: the dock grows into a centred window with a chat
      history rail (open, delete, new chat); `interpolate-size` makes the
      auto→fixed height a real transition
- [x] **One card**: panel and composer are a single surface that grows via
      `grid-template-rows: 0fr -> 1fr`; the rainbow ring wraps the whole thing
- [x] Pending state: shimmering "Thinking..." fills the gap between send and
      first token, announced with `aria-live`
- [x] Thought process auto-opens while the model works, collapses to
      "Worked for Ns" on finish; a manual toggle outranks both
- [x] Typing mid-run queues a follow-up, sent when the run settles
- [x] Close collapses the card; focusing the composer re-extends it
- [x] **Error handling**: coded JSON errors from the route, mapped to human
      copy in `lib/ai/errors.ts`, rendered as a bordered row with Retry wired
      to `regenerate()`. Errors force the card open. Offline detected via
      `useOffline()`. Raw `error.message` is never rendered.
- [x] Stale/unkeyed model id falls back to the default instead of 500ing
- [x] Tool failures show the tool's own error string, not just "failed"
- [ ] No voice input or attachments

## 8. Quality gates
- [x] Optimistic writes everywhere, with automatic revert on failure: task
      toggle **and** inline add, money add/edit/delete (rows, totals, chart and
      balance all move at once), category add/archive, wallet balance
- [x] `requireUser` verifies the JWT with `getClaims()` instead of a network
      `getUser()` on every render
- [x] `set_wallet_balance` RPC — one statement instead of read-then-write
- [x] Notes: `NotesBoard` owns the optimistic list; the new-note dialog closes
      on submit, not on the server's answer
- [x] Page-header dialogs (task / note / event) close immediately and reopen
      with what was typed if the write fails
- [x] Skeletons are panel-shaped, never page-shaped
      (`components/layout/skeletons.tsx`); page chrome never has one
- [x] Tool schemas carry raw values so a transforming zod field is never
      applied twice (this stored agent amounts 100x too large)
- [x] House rules written down in `AGENTS.md`
- [x] No secrets in source
- [x] `tsc --noEmit` clean
- [ ] `bun run build` - **not run this round at your request**
