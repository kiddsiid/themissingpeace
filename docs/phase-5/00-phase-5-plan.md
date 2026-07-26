# Phase 5 Plan & Work Order — Feast Studio (the Living Canvas Feast room, un-deferred)

**From:** Claude (product / architecture / backend)
**To:** Codex (implementation lead) + Owner (Sid)
**Date issued:** 2026-07-24
**Builds on:** Phases 2–4 (engine, Living Canvas + Atmosphere/Atelier, connected modules + collaboration).
**Design source of truth:** `docs/design/Feast-Studio-Redesign-Plan.md` (§5–21, tickets FS-001…016) + `One-Engine-Redesign-Plan.md` MP-008/009/010.

---

## 0. The one constraint that governs everything

**Feast Studio IS the Living Canvas Feast room.** It replaces the Feast experience *in that same
space* — it does not become a separate or parallel studio. Concretely:
- **Un-gate the room:** in `app/(app)/canvas/LivingCanvas.tsx` flip the `feast` card `available: false → true`
  and restore a real CTA ("Enter the Feast"); remove the "Coming in a later phase" copy.
- **Replace the route in-place:** `app/(app)/canvas/feast/page.tsx` (currently the deferred placeholder
  Claude added in Phase 4) renders the **redesigned** Feast Studio, living under `/canvas/feast` as the
  third room beside `/canvas/atmosphere` and `/canvas/atelier`. Same shell, same Dream Drawer + Peace
  Panel room contract as MP-007 — Feast is a room, not an island.
- The existing 1,018-line `FeastStudio.tsx` + `actions.ts` are the **starting point to refactor**, not a
  second implementation to keep alongside. Migrate current meal-scene/dish data into the new tables.

## 1. Objective & gate

Turn Feast into the signature room: a scene-by-scene meal plan whose **guest-care coverage is honest**
(never claims "safe" it can't prove), that produces a **private caterer brief** with immutable versions,
and that reads/writes through the shared domain layer like every other room.

**Gate (from §21):**
- **Religious:** a certified-kosher requirement is **not** covered by "kosher style" — stays Unknown until
  a certificate is recorded; the brief lists the open confirmation.
- **Allergy:** a nut allergy is **not** marked safe by ingredient compatibility alone — stays Needs review
  until preparation/cross-contact is vendor-confirmed.
- **Caterer brief:** changing a dish after brief v3 shows "update available", names the affected section,
  and creates v4 without mutating v3.
- New plan works on a 390px phone (no horizontal overflow), offline draft survives refresh, a11y AA.

## 2. Backend (Claude — DONE / verifiable)

**Migration `0024_feast.sql`** (delivered, pglast-valid; apply after `0023`, with owner sign-off):
`feast_plans` (one per workspace), `meal_scenes`, `dishes`, `guest_requirements`, `confirmation_evidence`,
`dish_assessments` (unique per dish×requirement), `caterer_brief_versions` (immutable, changed-section
tracking). RLS in-migration on every table. **Add to `0000_reset`:**
`drop table if exists caterer_brief_versions, dish_assessments, confirmation_evidence, guest_requirements, dishes, meal_scenes, feast_plans;`
(drop children before parents; or individual drops in that order).

**Pure coverage engine `src/lib/feast/hospitality.ts`** (delivered) + **`tests/hospitality.test.ts`**
(delivered, **13/13 executed green in sandbox**). This is FS-007/008 done deterministically:
- `coverageForRequirement(req, assessments) → 'unknown'|'needs_review'|'compatible'|'confirmed'|'conflict'`
  — encodes the certified-kosher and allergy rules and is **evidence-guarded** (a confirmed state with no
  evidence record is downgraded).
- `hospitalityScore(items) → { score 0..1, counts, conflicts, openConfirmations }` — the Hospitality Score.
- `briefReady(items) → boolean` — no conflicts and no open safety-critical/certified gaps.
Codex consumes these directly; **do not re-derive coverage in the UI** (§12: one projection, not three stores).

**Assessment states (§9.2) — use exactly these, never "safe":**
`unknown` · `ingredient_compatible` (unconfirmed) · `vendor_confirmed` · `certification_documented` · `conflict`.

## 3. Codex work order (UI — verify visually), grouped by the FS ticket map

- **FS-001/002/003 — Foundation & shell:** absolute hero wrapper, constrained Feast Header, responsive
  room shell inside the Living Canvas, routes not buttons, labeled controls, named dialogs, real
  loading/empty/error/stale states. (Fixes the current layout/mobile defects §3.)
- **FS-004/005/006 — Feast Map · Tasting Canvas · Dish Editor:** scene create/rename/reorder/duplicate/
  archive (keyboard-supported), scene editor + dish cards in all states, progressive dish drawer (desktop)
  / full-screen sheet (mobile) with validation + sticky actions. Reorder persists via a version-guarded action.
- **FS-007/008/009 — Requirement model · Coverage · Evidence:** persist requirements
  (`guest_requirements`), render coverage from `hospitality.ts` (Covered / Unknown / Needs review /
  Conflict — the five states, color per §11.1), and the evidence recorder (`confirmation_evidence`:
  source, confirmer, date, notes, attachment). **Remove "Verified safe."**
- **FS-010 — Peace Panel:** coverage + cost + execution + open decisions + brief readiness + next action,
  reading shared data (no generated imagery required to function).
- **FS-011 — Presentation:** service/mood choices change the plan summary and brief content (no decorative-
  only selection).
- **FS-012 — Caterer brief:** live preview, readiness (`briefReady`), immutable `caterer_brief_versions`,
  changed-section detection, private PDF export. Mirror the generic freshness via `output_versions`
  (0023) so printables/outputs show "update available" too.
- **FS-013/014 — Autosave/offline · Collaboration:** 600ms autosave + immediate discrete saves; the
  Phase-4 draft queue + version-conflict merge (`merge-conflict.ts`) + object presence/comments apply here.
- **FS-015/016 — Accessibility · Observability:** WCAG 2.2 AA suite; analytics **without private text
  capture** (Peace Notes and requirement notes never leave the workspace).

### Room integration (do not skip)
Feast reads the **Compass** (Dream Drawer) and shows its insights in the **Peace Panel**, same as
Atmosphere/Atelier. A decision that changes the meal (e.g. family-style → plated) runs the Phase-2 ripple
preview and emits a `ripple_events` row (staffing, rentals, timeline, seating, Money Map, caterer brief).

## 4. Guardrails
"Safe" is never a status — state exactly what was checked. Certified requirements need a certificate;
allergies need preparation/cross-contact confirmation; both are evidence-guarded. RLS ships in
`0024`; keep `0000_reset` in sync; pglast-validate; live only with owner sign-off; never commit/push from
the sandbox. Generated dishes/briefs are Draft with a rationale. Peace Notes never enter Feast surfaces.

## 5. Out of scope (later / polish)
Real caterer portal accounts (vendors stay internal records in v1). Generated food imagery is optional and
Draft-labeled. Final launch-hardening (RLS re-proof, a11y sign-off, marketing funnel) remains the Phase-6 pass.
