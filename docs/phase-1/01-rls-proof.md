# Phase 1 — RLS Proof (evidence)

**Status:** Phase 1 headline (R-2) — **workspace isolation proven, with one gap found and fixed.**
**Date:** 2026-07-21
**How:** the real migrations were loaded into a throwaway PostgreSQL 16 mirror and an isolation proof was run as role `authenticated`. This is deterministic evidence of the *policy logic*; the end-to-end Clerk-JWT path is covered by a separate integration test that runs after the owner completes the dashboard setup (§5).

---

## 1. Result

All nine core isolation checks pass; after the hardening migration `0015`, the two advisory checks pass as well (11/11). Peace Notes visibility is intact.

| Kind | Result | Check | Detail |
|---|---|---|---|
| MUST | PASS | A reads only own `board_items` | saw 1 |
| MUST | PASS | A cannot read B `budget_items` | saw 0 |
| MUST | PASS | A reads only own `decisions` | saw 1 |
| MUST | PASS | A cannot read B `guests` | saw 0 |
| MUST | PASS | A `INSERT` into B is blocked | blocked (SQLSTATE 42501) |
| MUST | PASS | A sees own Peace Note | saw 1 |
| MUST | PASS | B reads only own `board_items` | saw 1 |
| MUST | PASS | B cannot read A `decisions` | saw 0 |
| MUST | PASS | B cannot see A private Peace Note | saw 0 |
| ADVISORY | PASS *(after 0015)* | `workspaces` enforces RLS | authenticated saw 1 (want 1) |
| ADVISORY | PASS *(after 0015)* | `users` enforces RLS | authenticated saw 1 (want 1) |

## 2. The gap found — and the fix

`0001_init.sql` enables RLS on every workspace-scoped **data** table but leaves **`workspaces`** and **`users`** open. An authenticated client (anon key + Clerk token) could therefore enumerate **all workspace names and all user emails/rows** across every couple on the platform. The app doesn't currently read those two tables through the RLS client (it uses the service role, which is correctly scoped), so this is a latent defense-in-depth hole, not an active leak — but it must be closed before the RLS client is used anywhere, and before launch.

**Fix — `supabase/migrations/0015_rls_harden_identity_tables.sql`** (verified against the mirror):
- Enables RLS on `workspaces` and `users`.
- `workspaces`: members may `select` only workspaces in `auth_workspace_ids()`; writes stay service-role only.
- `users`: members may `select` only themselves and co-members of their workspaces, via a **security-definer** helper (`auth_visible_user_ids()`) that prevents policy recursion.
- Verified: applying `0015` flips both advisories to PASS **and** leaves all nine core checks — including Peace Notes — green. No regression.

Because server code uses the service role (which bypasses RLS), `0015` does **not** change existing app behavior; it only closes direct-client enumeration.

## 3. What this proves — and what it doesn't

**Proven (deterministically, at the DB layer):** the RLS *policies* isolate workspaces for reads and writes, Peace Notes stay private to author/partner, and the `0015` hardening is safe. This holds regardless of the app layer because it runs as `authenticated` with RLS enforced.

**Not yet proven here (needs owner setup):** that Clerk actually issues Supabase-readable tokens end-to-end (Clerk integration + Supabase third-party auth). Until that's on, `supabaseForUser()` can't exercise these policies over PostgREST. The integration test in §5 proves that final link.

## 4. Files delivered
- `supabase/migrations/0015_rls_harden_identity_tables.sql` — the hardening migration (**run after 0014**).
- `supabase/tests/rls_proof.sql` — the portable proof. Runs in the Supabase SQL editor or via `psql -f`. Transaction-wrapped (`begin … rollback`) so it leaves the DB untouched. **Run only on a non-production database** (it truncates the seeded identities).
- `tests/integration/rls-isolation.test.ts` — the live Clerk-JWT integration test (skipped unless `RLS_LIVE=1`; refuses to run against the production project ref).
- `docs/phase-1/01-rls-proof.md` — this document.

## 5. Owner steps to light up the full JWT path

One-time dashboard setup (only you can do these):
1. **Clerk** → enable the **Supabase integration** (Clerk issues a JWT whose `sub` is the Clerk user id).
2. **Supabase** → **Authentication → Third-party auth** → add **Clerk**.
3. Confirm migrations `0001…0003` and **`0015`** are applied (you've run 0000–0014; add 0015).

Then prove the end-to-end path on a **staging** project:
```
RLS_LIVE=1 \
SUPABASE_URL=... SUPABASE_ANON_KEY=... \
RLS_TOKEN_A=<clerk jwt user A> RLS_WS_A=<workspace uuid A> \
RLS_TOKEN_B=<clerk jwt user B> RLS_WS_B=<workspace uuid B> \
pnpm vitest run tests/integration/rls-isolation.test.ts
```

## 6. Reproduce the DB-layer proof
```
# any Postgres 16; load migrations behind a minimal Supabase shim, then:
psql -v ON_ERROR_STOP=1 -d <db> -f supabase/tests/rls_proof.sql
# exits non-zero if any core isolation check fails
```

## 7. Note on scope
Verified against a mirror of migrations `0001, 0002, 0003, 0005, 0012` plus `0015`. Every other workspace-scoped table (`vendors`, `tasks`, `events`, `documents`, `seating_*`, `playlist_*`, `honeymoon_*`, `canvas_state` from 0014, the Money-Map tables, etc.) uses the **identical** `workspace_id in (select auth_workspace_ids())` membership policy from `0001`, so the same guarantee applies; the proof seeds a representative subset. It was **not** run against the production database.
