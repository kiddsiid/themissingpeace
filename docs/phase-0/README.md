# The Missing Peace — Phase 0: Audit & Product Contract

**Status:** Phase 0 deliverable (the gate before any implementation).
**Prepared:** 2026-07-21.
**Scope of this session:** documentation only. No production code was changed. Per the Master Build Directive, "no implementation begins until the existing system and migration boundaries are documented."

---

## The one thing to read first

The Missing Peace is **not** a marketing site plus a prototype waiting to be built. It is an already-substantial, in-progress full-stack product that sits on **exactly the target stack** named in the directive (Next.js App Router 15, React 19, TypeScript, Tailwind, Clerk, Supabase, Liveblocks, Cloudflare via OpenNext, Anthropic SDK). It has a 60-table Postgres schema with RLS scaffolding, a real deterministic rules engine plus a bounded AI layer, capability-based permissions, ~18 working app routes, and 27 passing unit tests, built across roughly 17 documented work sessions.

**This changes the shape of the whole project.** The directive is written as "rebuild the prototype into production." The honest finding is: **the production engine mostly exists; the job is to close specific gaps, harden it, and make the public prototype a truthful seeded mirror of it — not to rebuild from zero.** Rebuilding from scratch would destroy a large amount of correct, tested work and violate the directive's own non-negotiable #21 ("preserve valuable work") and the "avoid destructive rewrites" rule.

A second, equally important finding: there are **two parallel codebases** that must be reconciled before anything else. See the audit.

---

## The eight Phase 0 artifacts

| # | Document | What it answers |
|---|----------|-----------------|
| 00 | [Repository Audit](./00-repository-audit.md) | What exists, in which of the two codebases, and what to preserve / migrate / rewrite / deprecate / remove. |
| 01 | [Architecture Map](./01-architecture-map.md) | The target layered architecture and the boundaries between marketing, demo, app, engine, data, AI, and analytics. |
| 02 | [Route & Module Inventory](./02-route-inventory.md) | Every current route, its module, its status, and the gaps against the directive's 16 modules and two experiences. |
| 03 | [Prototype Parity Register](./03-parity-register.md) | Every important prototype behavior mapped to its production counterpart, with a seeded-vs-persisted honesty flag. |
| 04 | [Data Model Proposal](./04-data-model.md) | The canonical wedding-workspace model: the 60 existing tables, the per-module read/write/owns/ripple contract, and the additions needed. |
| 05 | [Permission Model](./05-permission-model.md) | Roles, the capability map, RLS posture, couple-vs-planner separation, and the defense-in-depth work still open. |
| 06 | [Risk Register](./06-risk-register.md) | Ranked technical, product, and delivery risks with owners and mitigations. |
| 07 | [Migration Plan](./07-migration-plan.md) | The ordered, gated path from "two codebases + a prototype" to "one hardened engine + a truthful demo," mapped to the directive's Phases 1–8. |

---

## Phase 0 gate — recommendation

The directive's Phase 0 gate reads: *"no implementation begins until the existing system and migration boundaries are documented."* This document set satisfies that. The recommended decision at the gate:

1. **Adopt the local Next.js/Cloudflare/Supabase project as the single source of truth.** Deprecate the Emergent Python-FastAPI backend and the CRA React frontend on GitHub (they are a divergent second implementation on a non-target stack). Migrate any genuinely newer ideas from the Emergent `frontend/` (Feast Studio, Atmosphere Lab, caterer brief) as *concepts*, not code.
2. **Establish one repository of record** and push the local project to it, so "the GitHub repo" and "the working project" stop being two different things.
3. **Treat the public prototype as demo mode of the real components** (directive non-negotiable #5/#21), driven by a demo adapter — not the current standalone `localStorage` HTML.
4. **Do not rebuild.** Proceed into Phase 1 as *hardening + gap-closing*, not greenfield.

The three biggest open risks that Phase 1 must not skip: **(a)** Clerk↔Supabase JWT RLS is written but not proven — the app currently relies on service-layer scoping alone; **(b)** Weaver/Peacekeeper is a single server function with no per-surface loading/empty/failed/stale states and no citation/audit trail yet; **(c)** the couple-vs-planner split is currently one shared shell with an org-switcher, not two role-specific experiences. Details and mitigations in the [Risk Register](./06-risk-register.md).

---

## What was intentionally *not* done in this session

- No files in the working project were edited, moved, or deleted.
- No database migrations were run.
- No git commits or pushes were made.
- No visual/implementation work was started. That begins in Phase 1, only after this gate is reviewed and approved.
