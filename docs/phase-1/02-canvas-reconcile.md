# Phase 1 — T0: Canvas WIP reconciliation (disposition + evidence)

**Status:** T0 CLOSED — **KEEP** (commit + integrate), with two security/consistency fixes applied to the migration set.
**Date:** 2026-07-21

---

## 1. Disposition: KEEP

The uncommitted Living Canvas work is coherent, well-documented, and follows the
repo's existing conventions — it is intended product surface (the Feast /
Atmosphere / Atelier creative studios from the design handoff), not stray cruft.
Recommendation: **commit and integrate**.

Files in scope (all currently untracked / modified on disk):

| Path | What it is |
|---|---|
| `app/(app)/canvas/` (11 files) | Living Canvas hub + Feast/Atmosphere/Atelier studios (page + client component + server actions each) |
| `src/lib/canvas/` (5 files) | Shared model: `types.ts`, `seed.ts`, `store.ts` (Supabase persistence), `progress.ts`, `color.ts` |
| `supabase/migrations/0014_canvas_state.sql` | `canvas_state` JSONB table, one row per workspace |
| `src/components/nav.tsx` (modified) | Adds `/canvas` ("Living Canvas") to `NAV` and `MOBILE_NAV` |

Why KEEP rather than quarantine: the slice already wires to the app's real
Supabase layer (`src/lib/canvas/store.ts` uses `supabaseAdmin()` and tolerates a
not-yet-migrated table exactly like `budget/actions.ts`), reuses the app's token
system, and its pure logic is unit-testable. Quarantining would strand finished,
on-pattern work.

## 2. Fixes applied before it is safe to apply/commit

### 2a. RLS gap on `canvas_state` (security) — FIXED
`canvas_state` is workspace-scoped (`workspace_id` PK → `workspaces`), but as
originally written `0014` **did not enable RLS** on it. Every other
workspace-scoped table gets the `ws_member_all` membership policy (from `0001`,
and re-applied in each later migration, e.g. `0008`); `canvas_state` was the
**single exception** — the same class of latent enumeration gap that `0015`
closed for `workspaces`/`users`.

It is only *latent* today because `store.ts` reads/writes through the service
role (which bypasses RLS), but it must be closed before the RLS client is ever
used against this table, and before launch.

**Fix:** `0014` now enables RLS and adds the standard membership policy:
```sql
alter table canvas_state enable row level security;
create policy ws_member_all on canvas_state
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));
```
Because `0014` has never been applied to any database (per the work order,
"Do NOT run 0014 against the live DB until validated"), the fix was made
**in place in `0014`** — keeping table creation and its RLS together, the same
shape every other migration uses. *Alternative if you prefer strict append-only:*
move these three statements into a new `0016_rls_harden_canvas_state.sql`. Either
produces the identical end state; in-place is cleaner for an unapplied migration.

### 2b. `0000_reset.sql` was out of sync — FIXED
The reset did not drop `canvas_state`. Since `canvas_state` has an FK to
`workspaces` but is itself a parent (nothing cascades to drop it), re-running the
reset would leave a stale `canvas_state` behind, and `0014`'s
`create table if not exists` would then silently skip it. Added:
```sql
drop table if exists canvas_state cascade;
```
(placed with the other feature tables, before `workspaces` is dropped).

## 3. Evidence

All run in the sandbox against a throwaway PostgreSQL 16 mirror + esbuild/vitest.

- **SQL parse (pglast v8.2):** all 17 migration/test files parse clean, including the edited `0000`, `0014`, and `rls_proof.sql`.
- **esbuild parse sweep:** 16/16 canvas TS/TSX files parse clean (truncation/syntax check).
- **RLS isolation proof (DB-layer, role `authenticated`):** the canonical `supabase/tests/rls_proof.sql` — extended this session to cover `canvas_state` — passes **14/14** (12 MUST + 2 ADVISORY). New canvas checks: *A reads only own canvas_state*, *A cannot read B canvas_state*, *A INSERT into B canvas_state blocked (SQLSTATE 42501)*. Existing 11 checks unchanged → **no regression** from the `0014` edit. A standalone probe additionally confirmed a cross-workspace UPDATE is hidden by RLS (0 rows) and no row is tampered.
- **Canvas smoke tests (vitest):** new `tests/canvas.test.ts` — **10/10 pass**. Covers the DB-free pure helpers (`color.ts` mix/tint/shade/readableInk, `progress.ts` feast/atmosphere/atelier + `isLookBlessed`) and seed-board integrity. Imports only DB-free modules so it stays fast and deterministic.

## 4. Not done here (owner / follow-up)

- **Full `pnpm typecheck` / `pnpm build`** were not run in the sandbox (no
  `node_modules`; heavy for the full Next 15 + tldraw + liveblocks graph). Parse
  sweep + targeted vitest stand in. Re-run `pnpm typecheck && pnpm test && pnpm build`
  on your machine as the T5 gate before committing.
- **Applying `0014`/`0015` to live** is an owner step (see the RLS proof doc §5).
  The mirror proof + advisor is the safe pre-check; do not apply from the sandbox.

## 5. Suggested commit

Once you've re-run the local gate green, commit the canvas slice as one logical
change (the 16 canvas files + `0014` + `0000_reset` + `nav.tsx` + `tests/canvas.test.ts`).
Keep it separate from the design-system (T1) and analytics (T4) commits.
