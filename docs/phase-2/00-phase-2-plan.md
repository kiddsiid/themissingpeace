# Phase 2 Plan & Work Order — Core Engine (Ripple layer · Weaver maturity · Dream Walk)

**From:** Claude (product / architecture / review lead)
**To:** Codex (implementation lead) + Owner (Sid)
**Date issued:** 2026-07-22
**Builds on:** Phase 1 (foundation, RLS proven + hardened on live, design system, shell, analytics).

---

## 0. Phase 1 gate — CLOSED

Verified on the owner's machine: `pnpm typecheck` clean, `pnpm test` 57 passed / 4 skipped,
`pnpm build` compiled + 28 routes. Live DB: isolation proven and hardened (advisor 21→5, all
remaining intentional), migration history reconciled to `0000`–`0017`. Design system, mobile
shell, and the analytics taxonomy are in place — the last is the instrumentation substrate Phase 2 uses.

---

## 1. Objective & gate

Mature the **Peace Engine** from a one-shot AI summary into a **trustworthy, explainable engine**:
every insight is **deterministic-guarded, cited, and bounded**; changes **ripple** visibly to the
areas they affect; and the **Dream Walk** (the emotional onboarding that seeds the Compass) is
redesigned to match the product's voice.

**Gate:** a user can (a) make a change (approve a decision, adjust budget/guest count) and **see the
ripple** to affected modules; (b) open a Weaver insight and see **what it's based on** (citations to
real entities/facts) and **act on it** (accept / dismiss / defer) with the action **audited**; and
(c) complete a redesigned Dream Walk that produces the Compass. No insight may contradict a
deterministic fact, expose a Peace Note, or act autonomously.

## 2. Current state (grounding — what exists today)

- **Deterministic half:** `src/lib/engine/rules.ts` (`facts`, `deriveRisks`) — pure, tested.
- **AI half ("Weaver"):** `src/lib/engine/peacekeeper.ts` → `interpret()` calls Claude behind a
  boundary system prompt, returns free-form JSON. `run.ts` maps it into `planning_recommendations`
  / `planning_risks` and writes a `planning_engine_runs` row.
- **Tables (from 0001):** `planning_engine_runs`, `planning_recommendations`, `planning_risks`,
  `planning_dependencies`, `planning_snapshots`, `recommendation_feedback`, `audit_events`. Status
  enums exist (`recommendation_status`) but the lifecycle is not surfaced or audited.
- **Gaps Phase 2 closes:** (1) no **citations** — insights aren't linked to the facts/entities that
  grounded them; (2) no surfaced **state lifecycle** (accept/dismiss/defer + audit); (3) no **run
  audit** (model / prompt version / input hash / usage not recorded → not reproducible); (4) no
  **ripple layer** at all; (5) Dream Walk UI predates the design system.

## 3. Tasks (ordered, with acceptance)

### P1 — Ripple layer schema (`0018_ripple_events.sql`)  ·  owner: Claude (DB)
- New `ripple_events` table: `workspace_id`, `source_type`, `source_id`, `change_kind`, `summary`,
  `impact_json` (array of `{area, note, severity?}`), `origin_run_id` → `planning_engine_runs`,
  `created_by`, `created_at`.
- **RLS in the same migration** (the live `rls_auto_enable` event trigger force-enables RLS on every
  new table → without a policy it is instantly deny-all; this is the `canvas_state` lesson from Phase 1).
- Add drop to `0000_reset`.
- **Acceptance:** pglast-valid; on a PG16 mirror an authenticated member reads/writes only their
  workspace's ripples and is blocked cross-workspace; `rls_proof.sql` extended and green.

### P2 — Weaver maturity schema (`0019_weaver_maturity.sql`)  ·  owner: Claude (DB)
- `planning_recommendations` / `planning_risks`: add `citations_json jsonb default '[]'`
  (array of `{type, id, label}`), `source text` (`'deterministic'|'ai'`), `confidence text`,
  `acted_by uuid`, `acted_at timestamptz`.
- `planning_engine_runs`: add `model text`, `prompt_version text`, `input_hash text`,
  `output_json jsonb`, `usage_json jsonb`, `citation_coverage numeric` (share of AI insights that
  carry ≥1 citation).
- All `add column if not exists` (idempotent; these tables already carry RLS).
- **Acceptance:** pglast-valid; applies clean on the mirror over the full 0001→0019 chain; no RLS regression.

### P3 — Engine code: citations + determinism guard + audit  ·  owner: Claude (verifiable via tests)
- Extend the Peacekeeper output contract so each insight carries `citations: [{type,id}]` referencing
  entities present in the context (board_item / budget_item / vendor / decision / task / compass / fact).
- In `run.ts`: **drop or down-rank any AI insight that cites nothing or contradicts a deterministic
  fact** (deterministic-guard); tag `source`; compute `citation_coverage`; record `model`,
  `prompt_version`, `input_hash` (hash of the context), `usage_json` on the run; log state changes to
  `audit_events`.
- **Acceptance:** unit tests (no network) for the guard + citation mapping + coverage math, using a
  stubbed `interpret()`; `pnpm typecheck`/`test` green. (The live model call stays integration-gated.)

### P4 — Ripple emission + engine wiring  ·  owner: Claude (server) / review with Codex
- Emit a `ripple_events` row from the mutation points that already exist (decision approve, budget
  item change, vendor status → booked, guest estimate change, compass update), with a computed
  `impact_json`. Fire the `ripple_viewed` / relevant analytics events.
- **Acceptance:** approving a decision writes one ripple row with a non-empty `impact_json`; unit
  test on the pure impact-derivation function.

### P5 — Weaver + Ripple surfaces (UI)  ·  owner: Codex (or Claude with owner visual review)
- Peace Center: insight cards show citations (chips linking to the cited entity), a state control
  (accept/dismiss/defer) that persists + audits, and a "why" disclosure. A ripple feed shows recent
  ripples with their affected areas. Built on the Phase 1 design-system primitives.
- **Acceptance:** keyboard-accessible, AA, reduced-motion; state changes persist and re-render; works
  at the mobile widths from Phase 1 T3.

### P6 — Dream Walk redesign (UI)  ·  owner: **Codex** (Claude reviews)
- Rebuild `app/(app)/dream` + `onboarding/DreamWalkOnboarding` on the design system: the guided
  emotional walk that seeds the Compass, with save/resume, reduced-motion, and the `dream_walk_started`
  / `dream_walk_completed` / `compass_revealed` events wired.
- **Why Codex:** UI redesign needs rendered-visual + interaction verification that the sandbox can't do.
- **Acceptance:** produces a valid Compass end-to-end; visual review by owner; a11y + analytics wired.

## 4. Division of labor (recommended)

- **Claude implements + sandbox-verifies:** P1, P2 (migrations, mirror-proofed), P3, P4 (engine/server
  code with unit tests + typecheck). These are deterministic and provable without a browser.
- **Codex implements (Claude reviews):** P5, P6 — the Weaver/ripple UI and the Dream Walk redesign,
  where correctness is visual/interactive. Claude supplies the design-system primitives and the data
  contracts; Codex renders and wires them.
- Rationale: keep each change where its verification lives. Same principle that made Phase 1's RLS
  provable and its live fixes safe.

## 5. Out of scope (Phase 3+)

Feast/Atmosphere/Atelier depth, Planner Experience, marketing/demo site, 3D/motion polish, real-time
multiplayer presence beyond what exists. Weaver stays request/triggered — no autonomous scheduling.

## 6. Guardrails (carry forward from Phase 1)

- **Every new workspace table needs its RLS policy in the same migration** (the `rls_auto_enable`
  trigger makes a policy-less table deny-all). Keep `0000_reset` in sync. pglast-validate + mirror-proof
  before applying. Apply to live only with owner sign-off; never commit/push from the sandbox.
- Weaver: deterministic-guarded, cited, bounded; never surfaces Peace Note bodies; never acts autonomously.
- Analytics stays opt-in + PII-scrubbing.
