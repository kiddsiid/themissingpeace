# Phase 2 — Codex Work Order (P5 + P6 UI)

**From:** Claude (product / architecture / backend)
**To:** Codex (implementation lead) + Owner (Sid)
**Date:** 2026-07-22
**Status of Phase 2 backend:** ✅ CLOSED by Claude (see below). This work order is the **UI half** only.

---

## 0. What Claude already finished (backend — verified in sandbox)

You are building on top of a **complete, tested engine backend**. Do not re-derive any of this; consume it.

| Task | Artifact | State |
|---|---|---|
| P1 Ripple schema | `supabase/migrations/0018_ripple_events.sql` | pglast-valid; RLS in-migration; `0000_reset` updated |
| P2 Weaver maturity schema | `supabase/migrations/0019_weaver_maturity.sql` | pglast-valid; additive/idempotent |
| P3 Citations + determinism guard + audit | `src/lib/engine/weaver.ts`, `run.ts`, `peacekeeper.ts` | unit-tested (`tests/weaver.test.ts`); guard drops uncited AI insights; `citation_coverage`, `model`, `prompt_version`, `input_hash`, `output_json`, `usage_json` recorded per run |
| P4 Ripple emission | `src/lib/engine/ripple.ts` + call sites | `deriveRippleImpact` unit-tested (`tests/ripple.test.ts`); `emitRipple` wired at **compass update, decision settle, vendor status change, budget item add, guest-estimate change** |
| P5 server side | `app/(app)/peace-center/actions.ts` → `setRecommendationStatus()` | persists `status` + `acted_by`/`acted_at`, writes `audit_events`, fires analytics. UI stub `src/components/peace/InsightActions.tsx` exists |

> **Before you start:** run `pnpm typecheck` + `pnpm test` on the owner's machine. Claude added the
> vendor/budget/guest ripple calls (`app/(app)/planning/actions.ts`, `app/(app)/budget/actions.ts`)
> in the cloud sandbox and could only parse-check them — confirm they typecheck. Then apply `0018`
> and `0019` to the live DB **with owner sign-off** (run order `0000 → 0001 → … → 0019 → 0020 → 0021`).

---

## Data contracts you will render (already in the DB)

**`planning_recommendations`** (per insight): `id, recommendation_type, title, description, reason,
priority, status, source ('deterministic'|'ai'), citations_json ([{type,id,label}]), confidence,
acted_by, acted_at, linked_entity_type, linked_entity_id`.

**`planning_risks`**: `id, risk_type, severity, title, source, citations_json`.

**`planning_engine_runs`**: `id, status, summary, model, prompt_version, input_hash, citation_coverage
(0..1), usage_json, created_at, completed_at`.

**`ripple_events`**: `id, source_type, source_id, change_kind, summary, impact_json ([{area,note,severity?}]),
origin_run_id, created_by, created_at`. Sorted `(workspace_id, created_at desc)`.

**Citation types** (`weaver.ts`): `board_item | budget_item | vendor | decision | task | compass | fact`.
Each `citations_json` entry is `{type, id?, label?}`. For `fact`, `id` is the fact `kind`; for `compass`, `id` is omitted.

---

## P5 — Weaver + Ripple surfaces (Peace Center)

Build on the **Phase 1 design system** (`src/design-system/*`: `Card`, `Button`, `Chip`, `Dialog`,
`Drawer`, `SaveState`, tokens). No new visual primitives.

### P5.1 Insight cards (extend, don't replace, `InsightActions.tsx`)
- Each recommendation card shows: title, `description`/`reason`, a **source badge** (`deterministic`
  = solid, `ai` = outline), and a **citation chip row** — one `Chip` per `citations_json` entry, label
  = `citation.label` (fallback to a friendly type name). Clicking a chip scrolls to / opens the cited
  entity (board item drawer, budget line, vendor, decision, task) — deep-link by `{type,id}`.
- **State control** (accept / defer / dismiss) already calls `setRecommendationStatus`; surface the
  three `Button`s (primary Accept, ghost Defer, ghost Dismiss) and reflect the returned state (the
  server revalidates). Accepted/dismissed cards move to a collapsed "Handled" group, not disappear.
- **"Why" disclosure**: a details/expander showing `reason` + the full citation list + `source`. This
  is the trust surface — an AI insight with citations must *show* them.
- Deterministic insights never show a Dismiss that implies the underlying fact is wrong — for
  `source='deterministic'` show **"Acknowledge"** instead of Dismiss (still writes status via the same action).

### P5.2 Run trust line
- Near the "Run Peace Engine" control, show the latest run's **`citation_coverage`** as a small
  readout ("Every AI insight here is backed by your plan — coverage 100%") and, if `< 1`, a muted
  note that low-confidence AI insights were withheld. Pull from the most recent `planning_engine_runs` row.

### P5.3 Ripple feed
- A "What this changed" panel listing recent `ripple_events` (most recent first, cap ~15). Each row:
  `summary` + a row of **area chips** from `impact_json` (chip color by `severity`: high = clay,
  med = gold, low = sage/neutral). Empty state: "Changes you make will show their ripples here."
- Fire the analytics `ripple_viewed` event when the panel enters the viewport (use the Phase 1
  analytics emitter, `surface: 'client'`).

### P5.4 Acceptance
- Keyboard-accessible (each control tabbable, Enter/Space activates), AA contrast, `prefers-reduced-motion`
  respected, works at the Phase 1 mobile widths (T3). State changes persist across reload. No citation
  chip renders for an entity the user can't open (filter to grounded ids — the backend already did this,
  so trust `citations_json`).

---

## P6 — Dream Walk redesign

Rebuild `app/(app)/dream` + `onboarding/DreamWalkOnboarding` on the design system. This is the
guided emotional walk that **seeds the Compass**.

### Source of truth for the experience
The reconstructed **marketing homepage** (`prototype/Homepage.html`, updated 2026-07-22) is the
canonical voice + interaction reference: the threshold entry, the "I'm arriving as… (A couple / A
planner · SOON / A dreamer)" role selector, and — most importantly — the **real Wedding Compass**
(seven Dream Clouds `family, warmth, table, music, beauty, ease, memory`, the moon with `compassShort`,
the drag→priority model, and the status words **In the constellation → Rising → Held close → Guiding
the compass**). Match that Compass model in-app; the homepage JS is a clean vanilla reference for the
drag/priority/sentence logic.

### Walk structure (produces a valid Compass end-to-end)
1. **Notice the feeling** — feeling chips + free text.
2. **Name what matters** — the seven Dream Clouds; user brings clouds toward the moon (priority).
3. **Carry it into the day** — season + light + rough guest scale, then a **Compass reveal** with the
   editorial sentence and the top priorities.
- Save/resume at every step (write through the domain layer / `WeddingState`); `prefers-reduced-motion`
  path; a valid `wedding_compass` row + `dreams` on finish.

### Analytics (Phase 1 taxonomy — wire these)
`dream_walk_started`, `dream_walk_completed`, `compass_revealed`. (Emitter: `src/lib/analytics`.)

### Role handling (align with homepage)
- Couple and dreamer proceed into the walk (dreamer = explore mode, no pressure to approve).
- **Planner is scaffolded** — the planner's walk is a *different* experience (Phase 4, Planner
  Experience). For now, selecting planner shows the "its own experience — coming next" state; do NOT
  route planner into the couple/dreamer walk.

### Acceptance
- Produces a valid Compass end-to-end; owner visual review; a11y + analytics wired; matches the
  homepage Compass model (labels, statuses, sentence).

---

## Guardrails (carry from Phase 1)
- Weaver output is deterministic-guarded, cited, bounded; **never surface Peace Note bodies**; the
  engine never acts autonomously.
- Analytics stays opt-in + PII-scrubbing.
- Never commit/push from the sandbox; migrations to live only with owner sign-off.
- Every new workspace table needs its RLS policy **in the same migration** (the `rls_auto_enable`
  trigger makes a policy-less table deny-all — the `canvas_state` lesson).

## Phase 2 gate (met when)
A user can (a) make a change and **see the ripple**; (b) open a Weaver insight, see **its citations**,
and accept/defer/dismiss it with the action **audited**; (c) complete the redesigned **Dream Walk**
and get a Compass. Backend (a/b data + audit) is done; this work order delivers the surfaces + (c).
