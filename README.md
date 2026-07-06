# The Missing Peace

A **Wedding Planning Engine** — a private collaborative workspace that turns a couple's
**Dream** into a living plan for every decision, vendor, guest, date, dollar, and detail,
and keeps that plan aligned with what matters.

> Beauty (the Board) · Meaning (the Dream / Wedding Compass) · Movement (the Peace Engine).

The build is driven by **`The Missing Peace - Build Plan v2.md`** (the approved blueprint).
Read it first — sections 2–6 are the spine.

## Stack
- Next.js (App Router) · React · TypeScript · Tailwind CSS
- Supabase (Postgres + Storage, RLS) — data system of record
- Clerk (auth; organizations = workspaces)
- Liveblocks (realtime board presence/cursors/storage)
- tldraw (board canvas) · Zustand (board state) · Framer Motion (the "poof")
- Anthropic Claude API (the Peace Engine intelligence layer / "Peacekeeper")

## Status
Foundation scaffold (Phase 0 + parts of Phase 1). **Cloud services are not yet wired**
(no live Clerk/Supabase/Liveblocks keys in this environment). See **`HANDOFF.md`**.

## Getting started (for Codex / engineering)
```bash
cp .env.example .env.local        # fill in real keys
npm install
# create a Supabase project, then run the migration:
#   supabase db push   (or paste supabase/migrations/0001_init.sql into the SQL editor)
npm run dev
```

## Layout
```
app/                     # Next.js App Router (landing + the app shell)
src/lib/types.ts         # domain enums + TypeScript types (mirror the schema)
src/lib/poof.ts          # the Poof conversion engine (skeleton + contract)
src/lib/seed/            # Claude-owned seed data (boards, taxonomies, folders…)
supabase/migrations/     # SQL schema (0001_init.sql = the core-loop data model)
HANDOFF.md               # what's built, what's next, ordered task list for Codex
```
