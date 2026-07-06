# The Missing Peace

**The Missing Peace** is an intelligent wedding planning engine for every aspect of your forever day: a private, collaborative workspace that turns a couple's Dream into a living plan for the ceremony, reception, guests, vendors, money, memories, and the tiny details that make the day feel like theirs.

It is built to feel like an interactive planning playground, but with an intelligence layer that keeps every choice aligned with what matters most.

## What The Website Does

The Missing Peace helps couples plan the full forever day through one connected system instead of separate spreadsheets, mood boards, guest lists, budgets, vendor notes, seating charts, websites, and print files.

The heart of the product is the **Dream -> Wedding Compass -> Peace Engine** loop:

- **Dream** captures what the couple wants the day to feel like.
- **Wedding Compass** turns those values into a shared north star.
- **Peace Engine** reads the plan and suggests next best actions, risks, tradeoffs, and gentle course corrections.

From there, every planning module shares the same data:

- **Peace Center**: the command center for Peace Score, next best actions, risks, decisions, vendor gaps, budget pressure, guest impact, and recent activity.
- **The Board**: an inspiration canvas where images, notes, links, and ideas can become real planning objects through the Poof workflow.
- **Master Vision**: the approved aesthetic and planning story assembled from the board.
- **Decisions**: a place to track options, votes, approvals, dependencies, and due dates.
- **Money Map**: a smarter budget workspace with cost ranges, payment milestones, contributions, scenarios, and Compass-aligned tradeoffs.
- **Vendors**: vendor tracking tied to categories, quotes, status, files, payments, and decisions.
- **Guests**: household-aware guest CRM with RSVPs, meals, dietary needs, travel info, contact collection, and notes.
- **Seating Studio**: a drag-and-drop reception and ceremony layout builder that uses the live guest list.
- **Wedding Website**: a public guest-facing page with RSVP and guest photo uploads.
- **Printables**: escort cards, place cards, table numbers, seating signs, menus, save-the-dates, and invitations generated from live planning data.
- **Timeline, Documents, Playlist, Honeymoon, and Peace Notes**: supporting modules that keep the whole plan connected.

The goal is simple: the couple should always know what matters now, what can wait, what is risky, and how each decision affects the forever day they said they wanted.

## Product Position

The Missing Peace is designed to be better than the scattered planning stack couples often build from:

- planning.wedding-style tactile tools
- Joy-style guest websites and RSVP flows
- Aisle Planner-style operational planning
- spreadsheets, Pinterest boards, shared notes, and message threads

Those products solve pieces of the wedding. The Missing Peace is meant to cover the whole forever day and make the pieces speak to each other.

The difference is that The Missing Peace is not only a set of tools. It is a values-aware, intelligent planning engine. Guest count affects Money Map. Seating understands households and meals. RSVP changes flow back into the guest CRM. Board inspiration can become vendors, decisions, budget items, and a Master Vision. The Peace Center brings the whole system back into one calm view.

## Current Build Status

The application has the main product surface in place, including:

- authenticated app shell and workspace navigation
- Dream and Compass foundations
- Peace Center dashboard
- inspiration board and Master Vision flow
- guest CRM
- public wedding website, RSVP, and guest photo pages
- seating and ceremony layout studio
- printables pipeline
- Money Map budget workspace
- vendors, decisions, timeline, documents, playlist, honeymoon, and Peace Notes surfaces
- Supabase migrations through `0013_guest_pages.sql`
- Cloudflare Workers deployment setup through OpenNext

See [HANDOFF.md](./HANDOFF.md) for the latest engineering handoff and remaining work.

## Tech Stack

- **App**: Next.js App Router, React, TypeScript, Tailwind CSS
- **Database and storage**: Supabase Postgres, Supabase Storage, row-level security migrations
- **Auth and workspaces**: Clerk
- **Realtime collaboration**: Liveblocks
- **Canvas and state**: tldraw, Zustand
- **Motion and UI**: Framer Motion, lucide-react
- **AI planning layer**: Anthropic Claude API
- **Deployment**: Cloudflare Workers with `@opennextjs/cloudflare` and Wrangler
- **Tests**: Vitest

## Local Development

1. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in real keys for Clerk, Supabase, Liveblocks, and Anthropic.

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Run the Supabase migrations in order from `supabase/migrations`.

5. Start the development server:

   ```bash
   pnpm run dev
   ```

## Cloudflare Deployment

This repo deploys the product to the existing Cloudflare Pages URL:

```text
https://themissingpeace.pages.dev
```

The app is still built with the OpenNext adapter. `pnpm run pages:build` prepares a Pages advanced-mode output in `.open-next/pages`, and `pnpm run deploy` uploads that product build to the `themissingpeace` Pages project.

The important files and scripts are:

- `wrangler.jsonc`
- `cloudflare-pages/wrangler.jsonc`
- `open-next.config.ts`
- `scripts/prepare-cloudflare-pages.mjs`
- `pnpm run pages:build`
- `pnpm run pages:deploy`
- `pnpm run deploy`
- `pnpm run preview`

The recommended production flow is:

1. Build the product with `pnpm run pages:build`.
2. Deploy to the existing Pages project with `pnpm run deploy`.
3. Set all build variables and runtime secrets in Cloudflare.
4. Keep future marketing/landing pages in a separate project so this URL stays the product.

Full instructions are in [DEPLOY.md](./DEPLOY.md).

## Important Environment Variables

Build-time public variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`

Runtime secrets:

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LIVEBLOCKS_SECRET_KEY`
- `ANTHROPIC_API_KEY`

Optional or future integrations are listed in [.env.example](./.env.example).

## Project Layout

```text
app/                     Next.js App Router pages, layouts, and server actions
src/components/          Product UI components
src/lib/                 Domain logic, engines, helpers, auth, Supabase, workspace code
src/lib/engine/          Compass, Peace Engine, Money Map, and rules logic
src/lib/seed/            Seed data and prompt assets
supabase/migrations/     Database schema and RLS migrations
tests/                   Vitest coverage for product logic
DEPLOY.md                GitHub to Cloudflare deployment guide
HANDOFF.md               Current build status and next engineering steps
```

## Quality Checks

```bash
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run preview
```

Use `pnpm run preview` before production deployment when you want to verify the app in the Cloudflare Workers runtime.
