# Phase 3 Plan & Work Order — The World layer (Living Canvas · Atmosphere · Atelier)

**From:** Claude (product / architecture / backend)
**To:** Codex (implementation lead) + Owner (Sid)
**Date issued:** 2026-07-22
**Builds on:** Phase 2 (Compass + Peace Engine + Ripple + Dream Walk).
**Design source of truth:** `docs/design/One-Engine-Redesign-Plan.md` §9, §11, §12, §14, §18–21, §26.

---

## 0. Scope decision (owner-approved, from `docs/design/INDEX.md`)

Build order: Foundation → Compass+Engine → **Living Canvas → Atmosphere/Atelier** → connected modules → collaboration.
- **Feast Studio is DEFERRED** (MP-008/009/010) — do **not** build the Feast Canvas/Hospitality/Caterer Brief in Phase 3.
- **The current Living Canvas is left as-is** except where this phase explicitly introduces the room shell around it.

So Phase 3 = **MP-007 (Living Canvas shell across three rooms)**, **MP-011 (Atmosphere ripple)**, **MP-012 (Atelier context)** — the "World" layer minus Feast.

## 1. Objective & gate

Turn the disconnected creative surfaces into **one Living Canvas with three rooms** (Feast placeholder,
Atmosphere, Atelier) that all read the Compass and write through the shared domain layer, and make a
**palette change ripple visibly** across surfaces.

**Gate (from §27 "Palette ripple"):** the couple changes the primary palette (e.g. sage → plum) and the
invitation, tablescape, attire context, florals, cake, menu card, private Guest Experience preview, and
lighting surfaces **visibly update**; any manual override is **preserved and labeled**. Every room action
writes through the domain layer and shows source + stale state. Deterministic preview surfaces first;
generated imagery is optional and always labeled Draft.

## 2. Backend (Claude — DONE / verifiable)

**Migration `0022_world_layer.sql`** (delivered, pglast-valid; apply after `0021`, with owner sign-off):
- `atmosphere_plans` (one per workspace): `palette_json {primary,secondary,accent,neutrals[]}`,
  `surfaces_json [{surface, applied, override, note}]`, `version`, `updated_by/at`. RLS in-migration.
- `attire_looks`: `role, label, items_json, palette_ref, approver_ids, status ('draft'|'proposed'|'approved'),
  version`. RLS in-migration.
- **Add to `0000_reset`:** `drop table if exists attire_looks; drop table if exists atmosphere_plans;`
  (place with the other Phase-2/3 drops).

**Pure domain function to add (Claude can supply + unit-test; no network):**
`src/lib/engine/atmosphere.ts` → `derivePaletteRipple(palette, surfaces): SurfaceUpdate[]` — given a new
palette and the current surfaces, returns which surfaces change vs which are override-locked. This is the
deterministic engine behind MP-011 and is unit-testable exactly like `ripple.ts`. **Contract:**
```ts
type Surface = { surface: string; applied: boolean; override: boolean; note?: string };
type SurfaceUpdate = { surface: string; from?: string; to: string; status: 'updated'|'override_kept' };
derivePaletteRipple(next: Palette, surfaces: Surface[]): SurfaceUpdate[]
```
Surfaces to cover: `invitation, tablescape, florals, cake, lighting, menu_card, attire_context, guest_experience`.

## 3. Codex work order (UI — verify visually)

Build on the Phase 1 design system + the Living Canvas that already exists. Every room reads the Compass
and writes through the domain layer (`WeddingState` → named actions, per MP-003).

### MP-007 — Living Canvas shell (three rooms)
- **Dream Drawer** (left): the Compass principles + Dream Clouds; dragging a cloud into a room links it
  (`DreamCloud.linkedModules`). **Living Canvas** (center): the active room. **Peace Panel** (right):
  the room's Peace insights + ripple preview (consume Phase 2 `planning_recommendations` / `ripple_events`).
- **Three-room selector**: Feast (placeholder card — "Coming in a later phase", not built), Atmosphere, Atelier.
- Migrate existing palette/attire data into `atmosphere_plans` / `attire_looks` via the domain layer
  (keep localStorage as a migration adapter, §20). No data loss.

### MP-011 — Atmosphere Lab + palette ripple
- Palette editor (primary/secondary/accent/neutrals) writing `atmosphere_plans.palette_json`.
- On change, call `derivePaletteRipple` and show a **ripple preview** (which surfaces will update, which
  overrides are kept) **before applying** — reuse the Phase 2 ripple-preview pattern.
- Deterministic **surface previews** for all eight surfaces (swatches/mock compositions), updating live.
  Overrides are preserved and **labeled "Manual override"**.
- Also emit a `ripple_events` row (`source_type:'compass'`→ use a new `'palette'`-flavored summary, or
  reuse `compass`/`board_item`; Claude can add `'palette'` to `RippleSourceType` if you want it distinct).

### MP-012 — Atelier (attire) context
- Look composer per role (partner_1, partner_2, party, guest dress code) → `attire_looks`.
- **Context previews** that inherit the atmosphere palette; **Couple Harmony** + **Wedding Party
  Harmony** readouts (deterministic: do the looks share palette/formality?). **Editable approvers**
  (`approver_ids`) + status `draft→proposed→approved`.

### Acceptance (per MP + §27)
- Palette ripple scenario passes end-to-end; overrides preserved+labeled; rooms write through the domain
  layer; source + stale state shown; a11y (keyboard, focus, screen-reader route/label/save), reduced-motion,
  390px mobile. Generated imagery optional + Draft-labeled with loading/empty/failed/stale states (§22).

## 4. Out of scope (Phase 3)
Feast Studio (MP-008/009/010) — deferred. Connected-module refactor, collaboration, planner, marketing
site → Phase 4. No autonomous generation; every suggestion labeled Draft with a Compass-tied rationale.

## 5. Guardrails
RLS in every new-table migration; `0000_reset` kept in sync; pglast-validate before apply; live only with
owner sign-off; never commit/push from the sandbox. Never surface Peace Note bodies. Analytics opt-in.
