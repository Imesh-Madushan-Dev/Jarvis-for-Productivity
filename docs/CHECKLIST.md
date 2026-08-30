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
- [x] **DML granted to `authenticated`** — tables shipped with only
      REFERENCES/TRIGGER/TRUNCATE, so every query failed 42501 regardless of RLS
- [x] Covering indexes on the `project_id` foreign keys
- [x] Security advisors: 0 errors
- [x] Generated TypeScript types checked in
- [ ] Leaked-password protection — **you must enable this** in the Supabase
      dashboard (Auth → Password security); not settable over MCP

## 2. Infrastructure
- [x] `.env.local` wired to the project (gitignored, `.env.example` committed)
- [x] `lib/supabase/{server,client,proxy}.ts` — `@supabase/ssr` getAll/setAll
- [x] `proxy.ts` refreshes the session + optimistic route guard
- [x] Email/password auth + login page (no account enumeration in errors)
- [x] `requireUser()` deduped with React `cache()` — 5 panels, 1 `getUser()`
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
- [x] Shared `lib/result.ts` — every action returns `ActionResult`, never a raw
      Postgres error
- [ ] `tools.ts` per module wrapping `actions.ts` — **not written**. Unused code
      until the chat panel exists; actions are already shaped for it.

## 4. Dashboard UI (reference parity)
- [x] App sidebar: user block, quick search, 2 nav groups, footer
- [x] Header: time-aware greeting, date, New Note / New Event / New Task
- [x] Notes: horizontal card rail, Recents / Suggested toggle
- [x] Calendar: hour strip, live current-time marker, positioned events
- [x] Tasks: checkbox list, strikethrough on done, inline add
- [x] Scratch Pad: debounced autosave with status
- [x] Empty states for every panel
- [x] Responsive; each panel streams in its own Suspense boundary
- [x] Keyboard: ⌘K / ⌘F quick search
- [x] Sidebar functional: ⌘B, rail drag-collapse, always-visible trigger,
      icon-collapse mode, mobile sheet, active-route highlight
- [x] `/notes`, `/calendar`, `/tasks`, `/settings` built and wired to the nav
- [x] Settings page edits display name + timezone (device-zone shortcut)
- [x] Command palette destinations mirror the sidebar's built routes
- [ ] Sidebar collapse state resets on reload. The provider writes the
      `sidebar_state` cookie, but reading it back needs `cookies()` in the
      layout, which would make the whole dashboard dynamic and cost the static
      shell that offline navigation depends on. Not worth the trade.
- [ ] Week / Month calendar views — rendered disabled, not built
- [ ] Files / Templates / Notebook / Tags / Shared — no data model yet, so the
      nav items render disabled rather than as dead links

## 5. Micro-interactions (transitions.dev tokens)
- [x] Motion token scale in `globals.css`; no component hardcodes a duration
- [x] `checkbox-check` installed verbatim — box fills, tick stroke-draws
- [x] `.t-press` on every button (scale on active, tokenised colour fades)
- [x] `.t-lift` on note cards and calendar events
- [x] `.t-rise` staggered mount reveal on headings
- [x] Theme toggle cross-fades sun/moon
- [x] `prefers-reduced-motion` guard on all of it
- [ ] `skeleton-reveal` — **deliberately skipped**: its two-layer class-swap
      model fights Suspense, which replaces DOM instead of toggling classes

## 6. Egress + web platform
- [x] Narrow column selects (`TASK_COLUMNS` etc.) instead of `select("*")`
- [x] Row limits on every list query
- [x] `use cache: private` + `cacheLife` on reads (browser-memory; helps soft
      navigation, not cold loads)
- [x] `invalidate()` = `updateTag` + `refresh` — `refresh` is required because
      the private cache lives in the browser
- [x] localStorage: scratch-pad crash recovery, notes tab, calendar view
- [x] PWA: manifest, icons, standalone, safe areas, offline retry

## 7. Quality gates
- [x] Optimistic toggle with automatic revert on failure
- [x] No secrets in source
- [x] `tsc --noEmit` clean
- [ ] `bun run build` — **not run this round at your request**
