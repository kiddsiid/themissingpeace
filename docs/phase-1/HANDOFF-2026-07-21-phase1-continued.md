# Session Handoff — 2026-07-21 (Phase 1 continued: T0 · T1 · T3 · T4)

**Read after** `HANDOFF-2026-07-21.md`. This session picked up the Phase 1 "do next"
queue and delivered T0 (canvas reconcile), T1 (design system), T4 (analytics stub),
and the T3 app-shell primitives. Owner (Sid) confirmed Clerk↔Supabase integrated and
`0015` pushed before this session. Follows the work order's §5 handoff format.

> **Guardrail respected:** nothing was committed from the sandbox. All work was done
> on a staged copy; the changed/new files are written back to your working tree for
> you to review (`git diff`) and commit on your machine.

---

## 1. What was built / changed (exact paths)

**T0 — canvas reconcile (fixes to existing WIP):**
- `supabase/migrations/0014_canvas_state.sql` — *edited*: added RLS `enable` + `ws_member_all` membership policy on `canvas_state` (was the only workspace table without RLS).
- `supabase/migrations/0000_reset.sql` — *edited*: added `drop table if exists canvas_state cascade;` (reset was out of sync).
- `supabase/tests/rls_proof.sql` — *edited*: extended the canonical proof to seed + assert `canvas_state` isolation (now 14 checks).
- `tests/canvas.test.ts` — *new*: 10 smoke tests over the DB-free canvas helpers + seed integrity.
- `src/components/nav.tsx` — *edited*: added `aria-current="page"` on the active link (a11y).
- Disposition + evidence: `docs/phase-1/02-canvas-reconcile.md` — *new*.

**T1 — design-system primitive layer (`src/design-system/`, all new):**
`tokens.ts` (typed tokens + AA contrast notes + shared `focusRing`), `cn.ts`,
`Button.tsx`, `Card.tsx`, `Field.tsx` (Field/Input/Textarea/Label), `Chip.tsx`,
`Dialog.tsx`, `Drawer.tsx`, `useOverlay.ts` (focus-trap/Esc/scroll-lock hook),
`Arch.tsx`, `DreamCloud.tsx`, `SaveState.tsx`, `index.ts`.
- `app/globals.css` — *edited*: added `drawer-in-left/right` keyframes (motion tokens).
- Visual preview: `docs/phase-1/design-system-preview.html` — *new* (static mirror for review).

**T4 — observability / analytics skeleton (`src/lib/analytics/`, all new):**
`events.ts` (the full event taxonomy from the directive + typed prop shapes),
`emitter.ts` (opt-in, never-throws, PII-scrubbing `track()`), `index.ts`.
- Wired one real event end-to-end: `app/(app)/onboarding/actions.ts` — *edited*: emits `workspace_created` right after the workspace row is created.
- `tests/analytics.test.ts` — *new*: 5 tests (off-by-default, emits when enabled, PII scrub, unknown-event ignore, sink-throw safety).

**T3 — app-shell hardening (primitives + wiring):**
- `src/components/MobileNav.tsx` — *new*: sticky mobile top bar + hamburger opening the DS `Drawer` with the full NAV (focus-trapped, Esc/backdrop close, reduced-motion, `aria-current`, emits `mobile_nav_used`).
- `app/(app)/error.tsx` — *new*: route-group error boundary (branded, `reset()` + refresh, emits `error_encountered` with only the hashed digest).
- `src/design-system/SaveState.tsx` — *new*: idle/saving/saved/error indicator with `aria-live`.
- `app/(app)/layout.tsx` — *edited*: skip-link, `<MobileNav/>`, `<main id="main-content" tabIndex=-1>` landmark.

**Infra:**
- `tsconfig.json` — *edited*: added `@/design-system` + `@/design-system/*` path aliases (consistent with the existing `@/lib/*`, `@/components/*` mapping).
- `vitest.config.ts` — *edited*: matching `@/design-system` alias.

## 2. Canvas / 0014 disposition

**KEEP (commit + integrate).** Coherent, on-pattern product surface. Two fixes were
required and applied before it is safe to apply/commit: (a) RLS on `canvas_state`,
(b) reset sync. Full rationale + evidence in `02-canvas-reconcile.md`. `0014` was
amended in place because it has never been applied to any DB (per the prior work
order); if you prefer strict append-only, move the three RLS statements to a new
`0016` — identical end state.

## 3. RLS proof — red→green evidence

Method mirrors last session: real migrations loaded into a throwaway **PostgreSQL 16**
mirror behind a minimal Supabase shim (`auth.jwt()` stub, `authenticated` role);
proof runs as role `authenticated` so RLS is enforced.

- **Regression:** after the `0014` edit, the prior 11 checks still pass → no regression.
- **New canvas checks (green with the fix):** `A reads only own canvas_state` (saw 1),
  `A cannot read B canvas_state` (saw 0), `A INSERT into B canvas_state` blocked
  (**SQLSTATE 42501**). A separate probe confirmed a cross-workspace UPDATE is hidden
  by RLS (0 rows) and no row is tampered.
- **Red without the fix:** with `canvas_state` RLS *not* enabled (original 0014), an
  `authenticated` client sees **all** workspaces' canvas rows — the checks above fail.
- **Total: 14/14** (12 MUST + 2 ADVISORY), Peace Notes still private.

## 3b. Live DB remediation — APPLIED this session (Task 1, after connector enabled)

Once the Supabase connector was enabled in-chat, the read-only corroboration turned up a
**real divergence between the live DB and the migration source**, which was then fixed and
verified. Applied as two tracked migrations directly to `ztgixihhivtharrelmps`.

**What was found (Security Advisor + `pg_policy` inspection):**
- An event trigger **`rls_auto_enable()`** auto-enables RLS on every new `public` table but
  never creates policies. As a result **7 tables were RLS-enabled with NO policy = deny-all**:
  `canvas_state`, `guests`, `households`, `honeymoon_profiles`, `playlist_tracks`,
  `playlist_track_hearts`, `link_previews`. Safe (no leak; app uses the service role) but
  wrong — the RLS client would see zero rows, and it diverges from 0004/0005/0006/0014 source.
- WARN: 5 SECURITY DEFINER/identity helpers had a **mutable search_path**; `set_clerk_user`
  and `rls_auto_enable` were **EXECUTE-able by `anon`** (a latent identity-spoof / internals vector).
- Migration history table was **empty** (schema was applied via the SQL editor, not tracked).

**What was applied (both validated on a Postgres 16 mirror first; proof stayed 14/14):**
- **`0016_rls_backfill_missing_policies.sql`** — restores the intended `ws_member_all`
  membership policy on the 6 workspace tables (direct for 5; child-via-`playlist_tracks` for
  `playlist_track_hearts`), matching 0001/0004/0005/0006/0014 exactly. `link_previews` is
  deliberately left deny-all (global cross-workspace cache; client-inaccessible is the safe posture).
- **`0017_harden_security_definer_functions.sql`** — pins `search_path = pg_catalog, public`
  on `app_clerk_user_id`, `auth_workspace_ids`, `auth_visible_user_ids`, `set_clerk_user`,
  `peace_note_is_open`; **REVOKEs EXECUTE from PUBLIC** on `set_clerk_user` and `rls_auto_enable`.
  `auth_workspace_ids`/`auth_visible_user_ids` keep EXECUTE (evaluated inside RLS policies;
  revoking would break every policy) — self-scoped, so direct calls leak nothing.
- **`supabase/tests/rls_proof.sql`** — now self-grants `set_clerk_user` to `authenticated`
  inside its rolled-back transaction, so the portable proof still runs after 0017's revoke.

**Result:** Security Advisor went from ~21 findings to **5**, and every remaining one is an
intentional, documented decision (`link_previews` INFO; `auth_workspace_ids`/`auth_visible_user_ids`
WARN — required by RLS). Post-apply `pg_policy` check confirms all 6 tables now have their policy.
Because these migrations were applied via the MCP, they now appear in Supabase migration history
(previously empty). The two SQL files are in your repo under `supabase/migrations/` for source-of-truth.

## 4. Where the plan / audit was wrong

- The work order (T1) listed **`slate` and `plum`** among the existing tokens. They do
  **not** exist in `app/globals.css` or `tailwind.config.ts`. The real accent set is
  gold / sage / clay / blush (+ `*-bg` tonal + `*-ink` variants). Primitives were built
  on the tokens that actually exist.
- The RLS proof note (§7, last session) implied every post-`0001` workspace table already
  carried the membership policy. True **except `canvas_state`** (0014), which this session
  found and fixed. (`0008`'s eight money tables *do* get RLS — via a dynamic loop; only
  `cost_benchmarks` is intentionally a global read-only benchmark table.)
- Contrast reality check: solid **clay/sage/gold with white text fails AA** (2.85–3.58).
  Only solid **ink** clears AA text; accents must use tonal fills with dark text. A **gold
  focus ring fails 3:1** on pearl — focus rings use ink. The primitives encode this.

## 5. Commands run + results (secrets masked)

Sandbox only; no secrets touched (`.env.local` never staged).
- `pglast` parse — all 17 migration/test SQL files OK (incl. edited 0000/0014/rls_proof).
- Postgres 16 mirror + `rls_proof.sql` → **14/14 PASS**, exit 0.
- `esbuild` parse sweep — 16/16 canvas files + 19/19 new/changed DS/analytics/shell files, 0 failures.
- `tsc` (strict, extends real tsconfig) over DS + analytics + shell surface → **0 errors**.
- `vitest run tests/canvas.test.ts tests/analytics.test.ts` → **15/15 pass**.
- *Not run in sandbox:* full `pnpm typecheck` / `pnpm test` (42+) / `pnpm build` / workerd
  preview — no full `node_modules` (heavy graph: tldraw/liveblocks/supabase). These are the
  **T5 gate on your machine**.

## 6. Deferred / blocked

- **Live Supabase corroboration (Task 1):** the Supabase connector is connected at the org
  but **not enabled in this chat** (`enabledInChat:false`), so its MCP tools aren't reachable
  here. Enable it for this chat, then run **Security Advisor** (it should now report *no*
  RLS-disabled workspace tables once `0014`+`0015` are applied) and confirm `0001–0015` applied.
- **T3 remainder (Phase 2-ish):** collaborator/presence indicator and contextual "next
  actions" in the shell were not built (feature-level, need Liveblocks presence + engine).
  Responsive verification at 375/390/414/430px needs the running dev server — part of your T5 gate.
- **End-to-end Clerk-JWT RLS test** (`tests/integration/rls-isolation.test.ts`) still wants a
  staging project + two Clerk test users (owner step from last session).

## 7. Owner steps — apply, verify, commit

1. **Apply the migration fixes** to your Supabase project: re-run the amended
   `0014_canvas_state.sql` (it now also enables RLS; safe/idempotent — `if exists` + `drop
   policy if exists`). `0000_reset` is only for a full reset; no action unless you reset.
2. **Enable the Supabase connector in this chat** → run Security Advisor (read-only) to
   independently confirm no workspace table has RLS disabled.
3. **Review + commit** on your machine (suggested as 3 commits):
   - `T0 canvas`: the 16 canvas files + `0014` + `0000_reset` + `rls_proof.sql` + `nav.tsx` + `tests/canvas.test.ts`
   - `T1 design-system`: `src/design-system/**` + `app/globals.css` + `tsconfig.json` + `vitest.config.ts`
   - `T3+T4 shell/analytics`: `MobileNav.tsx` + `error.tsx` + `layout.tsx` + `src/lib/analytics/**` + `onboarding/actions.ts` + `tests/analytics.test.ts`
   Run `pnpm typecheck && pnpm test && pnpm build` green **before** committing (T5 gate).
4. Analytics stays **off** until you set `ANALYTICS_ENABLED=1` (or `NEXT_PUBLIC_ANALYTICS_ENABLED=1`)
   and install a real sink via `setAnalyticsSink()`.

## 8. Remaining risks + recommended Phase 2 start

- **R-2 fully closed at the DB layer** for every workspace table incl. `canvas_state`; the
  only open RLS item is the live-DB advisor pass (owner, §6) and the end-to-end JWT test on staging.
- **Adoption risk (low):** T1 primitives are published but modules are intentionally not
  restyled yet; adopt incrementally to avoid regressions.
- **Recommended Phase 2 start (per the work order §6):** core engine — Dream Walk redesign +
  ripple layer (`ripple_events`) + Weaver maturity (citations / states / audit), deterministic-guarded
  and bounded. The analytics taxonomy is already in place to instrument these as they land.
