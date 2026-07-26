# Phase 4 Plan & Work Order — Connected modules · Collaboration · Planner · Marketing

**From:** Claude (product / architecture / backend)
**To:** Codex (implementation lead) + Owner (Sid)
**Date issued:** 2026-07-22
**Builds on:** Phase 3 (Living Canvas + Atmosphere/Atelier).
**Design source of truth:** `docs/design/One-Engine-Redesign-Plan.md` §13, §14, §17, §20, §21, §26 (MP-013…018), §27.

---

## 1. Objective & gate

Make every planning module a **connected projection** of the one project (not an isolated store),
add **collaboration + resilience**, ship the **Planner Experience** (the "planner's walk" scaffolded on
the homepage), and finish the **marketing/demo site** that fronts it. At the end of Phase 4 the full loop
is demonstrable end-to-end and multi-user.

**Gate (from §27):**
- **Decision ripple:** changing the main meal (family style → plated) shows effects on staffing, rentals,
  timeline, caterer brief, seating context, and Money Map guidance **before applying**; the decision
  ledger records reason + affected objects.
- **Collaboration:** two partners edit different objects without blocking; a same-base-version conflict
  yields a field-level Keep mine / Keep theirs / Combine view.
- **Output freshness:** editing seating after generating escort cards marks the printable "Update
  available" and keeps the prior export as a version.
- **Planner:** a planner signs in, sees multiple couples, and carries each couple's Compass into their work.

## 2. Backend (Claude — DONE / verifiable)

**Migration `0023_collaboration_outputs.sql`** (delivered, pglast-valid; apply after `0022`, with sign-off):
- `decisions` += `linked_dream_ids jsonb`, `affected_objects_json jsonb`, `version int` (decision ledger, MP-013).
- `object_comments` (workspace, object_type, object_id, body, author_id, created_at, edited_at) — RLS in-migration. **Never used for Peace Notes.**
- `output_versions` (workspace, output_kind, payload_json, source_hash, is_stale, version, created_by) — RLS in-migration.
- **Add to `0000_reset`:** `drop table if exists output_versions; drop table if exists object_comments;`

**Planner org model — already present:** planners hop couples via Clerk `<OrganizationSwitcher/>`
(Settings) and the app follows the active org (`requireActiveWorkspace()`), and `0021_workspaces_optional_clerk_org.sql`
exists. **No new planner tables needed for the multi-couple switch** — the Planner Experience is a *surface*
(a planner home across workspaces) + the planner-specific Dream Walk, both UI.

**Pure domain functions Claude can supply + unit-test (no network), on request:**
- `staleOutput(sourceHash, output): boolean` — drives "Update available" (MP-016) deterministically.
- `mergeConflict(base, mine, theirs)` field-level 3-way for the conflict view (MP-017).
Say the word and I'll add these as tested `src/lib/…` modules (same pattern as `ripple.ts`/`atmosphere.ts`).

## 3. Codex work order (UI — verify visually)

### MP-013 Decision ledger
Decisions link to Compass/Dream items (`linked_dream_ids`), show options/votes/rationale/history and
**affected objects** (`affected_objects_json`); settling one runs the Phase 2 ripple preview + emits a `ripple_events` row.

### MP-014 Money & timeline (advisory, connected)
Money Map scenarios + Timeline dependencies **recompute from** decisions, guests, vendors, and the date —
no independently persisted duplicate totals (§19 selectors). Show source + which change drove the update.

### MP-015 Guest & seating
Guest **requirements**, households, coverage; seating **conflicts**; **mobile Arrange Mode** (390px:
full-screen map, pinch/drag, searchable guest drawer, assign + undo — §27 "Mobile seating").

### MP-016 Output projections
Documents, printables, and the private **Guest Experience** preview show **source + stale state**
(`output_versions` + `staleOutput`). Regenerate makes a new immutable version; prior version preserved.
Guest Experience preview shows a clear **Private preview** status — no publish implied.

### MP-017 Collaboration & resilience
Object presence (Liveblocks — presence never enters decision history, §21), `object_comments` threads,
optimistic edits with `version`-checked mutations, and the **field-level conflict view**. Local draft
queue + reconnect (§20): mobile edits write locally first, sync on reconnect (queue keeps id, base
version, changes, timestamp, retry count). Save states: Saving / Saved / Saved on this device / Sync
failed / Conflict (no per-save toast).

### MP-018 Quality gates
Accessibility, overflow, route, **unresolved-template test** (no `{{ }}` in shipped output — the
homepage lesson), performance, and visual checks all pass across the app.

### Planner Experience (the "planner's walk")
- **Planner home** across workspaces (the couples a planner manages), each card showing that couple's
  Compass + readiness + next action. Uses the existing Clerk org switch; no new tables.
- **Planner Dream Walk** — the *different* walk the homepage scaffolds. Framing: capture/carry the
  **couple's** feeling ("Carry the couple's feeling into every decision"), not the planner's own. Wire it
  to the homepage's planner role selection (currently marked "SOON").
- Client-facing planner permissions (per-member roles UI in Settings — carried over from the North Star Wave C list).

### Marketing / demo site
- The reconstructed **`prototype/Homepage.html`** (2026-07-22) is the live homepage — real Compass +
  clouds, centered "I'm arriving as…" entry, planner scaffold. Fold it into the marketing/demo target
  (`cloudflare-prototype/` per the deploy setup) and reconnect the funnel hooks noted in `LANDING-README.md`
  (email capture / founding offer / JSON-LD) **onto the new design** if/when the owner wants them back.
- `/demo` remains the old persona-picker homepage (noindex); `/privacy` + `/terms` intact.

### Acceptance
All §27 scenarios pass (Decision ripple, Collaboration, Output freshness, Private Guest Experience,
Accessibility). Planner can manage multiple couples. Marketing site serves the new homepage. a11y +
reduced-motion + 390px throughout.

## 4. Out of scope (Phase 4 / later)
Feast Studio depth (still deferred). Real payments/Stripe. 3D/motion polish beyond the design standard.
Autonomous engine scheduling (Weaver stays request/triggered).

## 5. Guardrails
RLS in every new-table migration + `0000_reset` sync; pglast-validate; live only with owner sign-off;
never commit/push from the sandbox. Peace Notes never enter comments/outputs/collaboration surfaces.
Every generated object labeled Draft with a Compass-tied rationale (§22). Analytics opt-in + PII-scrubbing.
