# Phase 1 Plan & Codex Work Order — Foundation (Hardening)

**From:** Claude (product / architecture / review lead)
**To:** Codex (implementation lead) + Owner (Sid)
**Based on:** `docs/phase-0/*` and the verified Phase 0 boundary work (Codex, 2026-07-21)
**Date issued:** 2026-07-21

---

## 0. Phase 0 gate — CLOSED

Reconciled against the working tree and Codex's HANDOFF note. Confirmed done:

- **One repo of record** — `github.com/kiddsiid/themissingpeace`, working tree `C:\Users\siddi\Documents\The Missing Peace`, branch `codex/update-prototype-from-zip`. Emergent scaffold removed. (Risk R-3, R-12 cleared.)
- **Secrets clean** — `.env.local` ignored + untracked + absent from history; `.env.example` only tracked env; masked scan found nothing. (Risk R-1 cleared.)
- **Hygiene + docs** — cruft untracked/removed; two deploy targets kept; product docs under `/docs`.
- **Verification (Codex-reported, to re-confirm at Phase 1 review):** typecheck pass · Vitest 42/42 · build 28 routes · esbuild clean over 105 files.

**Remaining headline risk into Phase 1: R-2 — prove RLS.**

---

## 1. Objective & gate (directive Phase 1)

Implement the production-grade foundation: app shell, design tokens→primitives, proven auth/permissions, hardened data access, error boundaries, observability, and mobile navigation.

**Gate:** a user can create or enter a workspace **securely** and see **persistent** data, with **RLS proven by an explicit cross-workspace authorization test**. (Secrets already clean.)

---

## 2. Owner prerequisites (only Sid can do these — they gate T2)

RLS cannot be *proven* until Clerk issues Supabase-readable tokens. Before/with T2:

1. In **Clerk**: enable the Supabase integration (Clerk issues a token whose `sub` = the Clerk user id).
2. In **Supabase → Auth**: enable **Clerk as a third-party auth provider**.
3. Run **`supabase/migrations/0003_clerk_jwt_rls.sql`** in the Supabase SQL editor (switches `auth_workspace_ids()` to read the Clerk id from `auth.jwt()`).
4. Confirm the migration run order is intact: `0000_reset → 0001 → … → 0013` (and 0014 once reconciled — see T0).

*Also decide:* is the **canvas WIP** (`app/(app)/canvas/`, `src/lib/canvas/`, `0014_canvas_state.sql`) yours and intended to keep? Answer drives T0.

---

## 3. Tasks (ordered, with acceptance criteria)

### T0 — Reconcile the owner canvas WIP (do first; unblocks a clean tree)
- Decide: **keep** (commit + integrate) or **quarantine** (move to a branch, remove from the working tree).
- If keeping: pglast-validate `0014_canvas_state.sql`; confirm it fits the run order and `0000_reset` drops its objects; ensure `app/(app)/canvas` + `src/lib/canvas` typecheck, parse (esbuild), and have at least smoke tests.
- **Do NOT** run 0014 against the live DB until validated and owner-approved.
- **Acceptance:** tree is clean (nothing stray untracked); a one-line disposition for canvas + 0014; tests/build/esbuild green.

### T1 — Design-system primitive layer
- Extract the existing tokens (`tailwind.config.ts`, `app/globals.css`: pearl/cream/ink/gold + clay/sage/blush/slate/plum, motion tokens) into a named `src/design-system/` primitive set: Button, Card, Field/Input, Dialog, Drawer, Arch, DreamCloud, Chip, plus typography scale, spacing, radius, elevation.
- Every primitive ships all states: default/hover/focus-visible/active/disabled/loading + reduced-motion + AA contrast.
- **Do NOT** restyle modules yet — just publish the primitives and adopt them where trivial.
- **Acceptance:** primitives render in isolation with visible focus + reduced-motion honored; no regression in existing pages; esbuild/typecheck green.

### T2 — PROVE RLS (headline; depends on §2 owner setup)
- Route reads through `supabaseForUser()` (the RLS client) where practical, keeping service-layer scoping as Wall 1.
- Add an **explicit authorization test**: with a real Clerk-issued token, **User A cannot read or write User B's workspace** across the core tables (workspaces, wedding_profiles, board_items, budget_items, decisions, guests, peace_notes). Peace Notes: verify locked bodies never return.
- Make the test **CI-gating**.
- **Do NOT** weaken Peace Notes' stricter policy or expose the service-role key client-side.
- **Acceptance:** the cross-workspace test is red without membership and green with it; Peace Notes locked-body test passes; documented in HANDOFF.

### T3 — App-shell hardening
- Persistent Compass access, current-workspace + collaborator presence, **mobile navigation drawer**, contextual next actions, clear save/sync states, error boundaries per route group, keyboard navigation, semantic landmarks, meaningful page titles.
- **Acceptance:** shell works at 375/390/414/430px; keyboard-only nav reaches every primary action; error boundary catches a thrown route error without white-screening; save/sync state visible on a write.

### T4 — Observability + analytics skeleton
- Turn on Cloudflare observability + an error tracker.
- Define the **event taxonomy** (from directive: dream_walk_started/completed, compass_revealed/saved/shared, partner_invited, module_opened, decision_created, ripple_viewed, weaver_insight_accepted, next_action_completed, demo_completed, early_access_reserved, workspace_created, collaborator_invited, mobile_nav_used, error_encountered) and a privacy-conscious emitter — **stubbed** now, wired as features land. No heatmaps/behavioral tracking without disclosure + consent.
- **Acceptance:** taxonomy documented; emitter callable and no-ops safely when disabled; one real event (e.g., workspace_created) fires end-to-end.

### T5 — Re-verify and record
- `pnpm typecheck`, `pnpm test` (report counts incl. the new RLS test), `pnpm build`, esbuild sweep; `pnpm preview` (workerd) smoke.
- Append a dated Phase 1 session note to `docs/HANDOFF.md`.
- **Acceptance:** all green; HANDOFF updated; handoff notes (§5) written.

---

## 4. Out of scope (Phase 2+)

Dream Walk redesign · ripple layer (`ripple_events`) · Weaver maturity (citations/states/audit) · Feast/Atmosphere/Atelier · Planner Experience · marketing/demo site · motion/3D. Foundational stubs only (e.g., the analytics emitter).

---

## 5. Handoff notes back to Claude (required format)

1. What was built/changed (exact paths). 2. Canvas/0014 disposition. 3. RLS proof: the test, and its red→green evidence (redacted). 4. Where the plan/audit was wrong. 5. Commands run + results (secrets masked). 6. Deferred/blocked + why. 7. Exact owner steps to commit/push + any dashboard setup still pending. 8. Remaining risks + recommended Phase 2 start.

---

## 6. What Claude reviews at the gate

Reconcile the notes; independently sanity-check the RLS test design (does it actually prove isolation, or just pass?); confirm Peace Notes safety; confirm no service-role key reaches the client; confirm a11y basics on the shell; then write the Phase 2 plan (core engine: Dream Walk redesign + ripple layer + Weaver maturity).

**Phase 1 done when:** the gate in §1 is met with the RLS test as evidence — not assumed.
