@AGENTS.md

# Saldo — Personal Finance App (Claude Code project config)

Saldo replaces a personal-finance Excel (EUR / Portugal) with a self-hosted, scalable
web + mobile **PWA**: fast expense capture, a "waiting for category" inbox fed by
moey! bank notifications, budgets with goal tracking, and month/year analytics. Runs on
the owner's Proxmox (Docker behind Caddy). Single user now, architected for multi-user
"books" (personal + shared *conjoint*) later.

## Deployment rule (do not violate)
- NEVER build this app on the server / Proxmox VM 100 — builds freeze the whole VM.
- Images are built and pushed from the PC (or CI), tagged :latest and the git SHA.
- The server compose uses `image:` only — it must never contain a `build:` section for this app.
- Deploying on the server means exactly: docker compose pull && docker compose up -d. Nothing else.
- If I say "deploy" / "ship" / "push it", run the PC build+push then the remote pull — do not add a server-side build.

## Persistent memory (read at session start)

Memory lives at `~/.claude/projects/G--Projects-Git-avieira-expenses/memory/`:
- `MEMORY.md` — index (loaded each session)
- `expenses-app-brief.md` — scope + the Excel it replaces
- `expenses-app-tech-decisions.md` — locked stack + setup answers + budget rule

## ⚠️ This is Next.js 16, not the one you remember

create-next-app installed **Next.js 16.2.9 + React 19.2**. APIs, caching, and config
differ from Next 14/15. **Before writing any config, route handler, server action, or
middleware: check `node_modules/next/dist/docs/` (see `@AGENTS.md`) or fetch current docs
via Context7.** Do not assume Next 14/15 behavior. Request APIs (`cookies()`, `headers()`,
`params`, `searchParams`) are async.

## Tech stack (locked)

Next.js 16 (App Router, Turbopack) · React 19.2 · TypeScript · Tailwind v4 ·
**`motion`** (Framer Motion) · **Drizzle ORM** + Postgres (postgres-js) · **Better Auth** ·
**Recharts 3** + bespoke SVG for the hero charts (no Tremor) · `zod` · `cuid2` ·
`date-fns` · `lucide-react` · `next-themes`. Deploy: Docker (`node:24-alpine`,
`output:'standalone'`) + Postgres 17 + one-shot migrate gate, behind Caddy. npm only.

## Domain invariants (MUST always hold)

1. **Money is integer cents** (`amountCents`), never a float. Format ONLY at the UI edge:
   `new Intl.NumberFormat('pt-PT', { style:'currency', currency }).format(cents/100)`.
2. **Signed amounts**: expense > 0, refund/income < 0. A `type` enum carries the semantic;
   net spend is a single `SUM(amount_cents)`. A CHECK enforces sign↔type (NULL amount
   allowed for un-parsed moey! captures).
3. **Tenant isolation**: every read/write is scoped by `book_id`, resolved from the
   caller's `book_members`. NEVER return or mutate rows across a book boundary.
4. **Budgets are effective-dated**: a month's budget = the latest row with
   `effective_from ≤ month-start` (per scope/category, via `DISTINCT ON`). Setting a budget
   is an INSERT/upsert — it changes future months only, never rewrites the past.
5. **moey! capture is one-tap assisted, not zero-touch.** iOS forbids reading another app's
   notification text, so capture = iOS Share-sheet Shortcut → `POST /api/ingest`. The inbox
   is a queue of partial transactions from a *pluggable* source; never hard-code "auto".
6. **Locale**: EUR, pt-PT. Transaction day is a `DATE` (no timezone, so a purchase never
   shifts across midnight).

## Behavioral rules

- Do what's asked; nothing more. Prefer editing an existing file to creating a new one.
- No new `*.md`/README files except the explicitly-requested deploy + iOS guides under `docs/`.
- Never save scratch files to the repo root.
- ALWAYS read a file before editing it.
- **Never commit secrets or `.env`.** Only `.env.example` (placeholders) is committed.
- **Tests**: pure-logic unit tests are ALLOWED and encouraged for the three correctness-critical
  areas only — **money math, budget resolution, the moey! parser**. No component/E2E/snapshot
  suites unless the user explicitly asks.
- Verify Next 16 / library APIs via `node_modules/next/dist/docs/` or **Context7** before writing.
- Run `npm run lint` and `npm run build` before calling a milestone done. Commit/push only when
  asked; branch off `main` first.

## Engineering Council Protocol

A council reviews every non-trivial proposal **before** code. Cost rule: build ONE shared
context packet (proposal + real `file:line` excerpts + hard facts), then brief reviewers —
they NEVER re-explore the repo. DEFAULT to a SINGLE multi-lens reviewer; escalate to
PARALLEL specialists only for high blast-radius changes.

**Review lenses** (single reviewer applies all in-scope; high-risk path = one specialist each):
- `data-sentinel` — Drizzle/Postgres query cost, indexes, **integer-cents integrity**,
  **book_id scoping**, migration safety, effective-dated budget resolution correctness.
- `perf-critic` — CWV (LCP/INP/CLS), RSC vs `'use client'` boundaries, bundle, chart/motion perf.
- `security-watch` — Better Auth, the **public `/api/ingest` webhook** (bearer token +
  constant-time compare + rate limit + idempotency), zod at boundaries, secrets, **book
  isolation**, SSRF/open-redirect.
- `ux-taste` *(UI scope only)* — mobile-first, motion budget + `prefers-reduced-motion`, the
  5-category data-color discipline, anti-AI-slop. Loads `taste-skill` + `soft-skill` before judging.
- `scope-advocate` *(devil's advocate)* — smaller alternative; guards the moey! one-tap reality,
  no premature multi-book UI, no over-charting.
- `infra-deploy` *(deploy scope only)* — Docker standalone, migrate gate, Caddy `X-Forwarded-*`
  + secure cookies, off-box backups.

**Convene before** new feature/route/component, money-math or aggregation changes, any
`src/db/*` schema/migration, `src/lib/auth.ts`, `src/lib/actions/*`, `middleware.ts`,
the `/api/ingest` pipeline, Docker/Caddy, or a new dependency. **Skip for** typos, comments,
formatting, single-file renames, lockfile-only updates.

**High blast-radius → parallel specialists** (same packet to each): auth/session, money math &
aggregation, DB migration/index, the `/api/ingest` webhook + parser, tenant isolation,
`middleware.ts`, Caddy/compose.

**Matrix → verdicts.** Present a `| Member | Verdict | Concern |` matrix before coding. A single
**BLOCK** is a hard stop (revise + re-review). APPROVE/CONCERN → implement, applying CONCERNs
inline. `/council <proposal>` runs the same procedure manually.

## Architecture & file organization

- `src/app/**` — thin route pages (composition + data boundaries). Parallel/intercepting routes
  for modal overlays (Add, edit, day-detail).
- `src/components/**` — reusable, product-named blocks (`BudgetGauge`, `AmountKeypad`,
  `CategoryPicker`, `PendingCard`, `MonthHeatmap`, `SpendTreemap`, `BookSwitcher`).
  `src/components/ui/**` — primitives.
- `src/lib/**` — utils, EUR/date formatting, the moey! parser; `src/lib/actions/**` — server
  actions (mutations + zod); `src/lib/queries/**` — typed read helpers; `src/lib/auth.ts`.
- `src/db/**` — Drizzle schema + client + seed. `drizzle/` — generated migrations.
- `docs/**` — deploy runbook + iOS Shortcut guide. `ops/**` — backup/migrate scripts.
- Root: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.env.example`, `drizzle.config.ts`.
- Keep files under ~400 lines; route pages far below. Logic in hooks/actions, not pages.

## Commands

```bash
npm run dev          # Turbopack dev server
npm run build        # production build (must pass before milestone done)
npm run lint         # eslint
npm run db:generate  # drizzle-kit generate (author migration from schema)
npm run db:migrate   # drizzle-kit migrate (apply committed SQL)
npm run db:seed      # seed categories for the default book
npm run db:studio    # drizzle studio
```

## Security rules

- Never hardcode secrets; read from env. `BETTER_AUTH_SECRET`, `INGEST_WEBHOOK_TOKEN`,
  `POSTGRES_PASSWORD`, `DATABASE_URL` are secret — `.env` only, never git.
- Validate all input at boundaries with zod. The `/api/ingest` webhook: bearer token
  (constant-time), rate limit, idempotency, body-size cap.
- Enforce book isolation on every query. Auth-gate everything except the token-gated webhook.
