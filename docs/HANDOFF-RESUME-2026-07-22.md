# CURRENT RESUME HANDOFF — Phases 2–5, Auth, and Showcase State

**For:** Claude, Codex, and Sid  
**Original handoff:** 2026-07-22  
**Updated by Codex:** 2026-07-25  
**Workspace:** `C:\Users\siddi\Documents\The Missing Peace`

This document supersedes the older state in which Feast Studio was deferred and planner switching was
described as Clerk-based. Feast was deliberately un-deferred in Phase 5, the app now uses Supabase Auth
and Postgres workspace memberships, and a dedicated backend-admin showcase workspace is live.

---

## 1. Read this before touching the tree

- **Do not reset, clean, discard, commit, push, or deploy without Sid's explicit direction.**
- The current branch is `codex/update-prototype-from-zip`.
- Current HEAD is still `65af9c1` (`Rebuild homepage from Claude Design...`, 2026-07-22).
- All Phase 2–5 implementation described below is still in the working tree.
- As of this handoff there are **106 changed/untracked files**:
  - 53 modified tracked files
  - 53 untracked files
- The tree includes Sid's source documents, migrations, implementation, tests, and prototype work.
  Treat all of it as intentional user work.
- Nothing from this implementation wave has been pushed or deployed.
- A production-mode local server is currently serving `http://localhost:3100`.
- Stop the server before running another clean build. A prior dev/build overlap corrupted `.next` and
  produced blank pages; the safe order is: stop server → remove only the repo's exact `.next` directory
  → `pnpm build` → `pnpm start --port 3100`.

The next product direction from Sid is to continue transforming the authenticated product until it
matches the prototype's depth, with every section working live enough for a showcase. Do not flatten the
product back into placeholders while doing that.

---

## 2. Executive state

| Area | Current state |
|---|---|
| Phase 2 — Engine + Dream Walk | Implemented |
| Phase 3 — Living Canvas + Atmosphere + Atelier | Implemented |
| Phase 4 — Connected modules + collaboration foundations + planner | Implemented to showcase depth; live multi-user/offline sign-off remains |
| Phase 5 — Feast Studio | **Implemented and live; no longer deferred or gated** |
| Supabase Auth transition | Implemented |
| Backend-admin showcase login | Implemented as a real Supabase Auth account |
| Maya / Julian / Aria showcase flavor | Seeded into the dedicated admin test workspace |
| Local production build | Passing and currently running on port 3100 |
| Git push / deployment | Not done |
| Launch hardening | Still open |

---

## 3. Phase 2 — Core Engine, Weaver/Ripple surfaces, and Dream Walk

### Backend contracts consumed

- `0018_ripple_events.sql`
- `0019_weaver_maturity.sql`
- Citation grounding, deterministic guards, run audit fields, input hashes, and citation coverage.
- Ripple emission from Compass, decisions, vendors, budget changes, and guest-estimate changes.
- Recommendation lifecycle with persisted action state and audit events.

### UI and app work completed

- Insight actions now expose source, citations, why/context, and persisted action states.
- Ripple history is surfaced through the Peace Center and Living Canvas.
- The redesigned Dream Walk uses the seven canonical Dream Clouds:
  `family`, `warmth`, `table`, `music`, `beauty`, `ease`, and `memory`.
- Cloud priority wording and Compass generation match the reconstructed homepage model.
- Couple/dreamer onboarding and the planner-specific walk are separate flows.
- Supabase-native workspace creation replaced the old Clerk-organization assumptions.

Primary files:

- `src/components/peace/InsightActions.tsx`
- `src/components/peace/RippleFeed.tsx`
- `app/(app)/peace-center/page.tsx`
- `app/(app)/onboarding/DreamWalkOnboarding.tsx`
- `app/(app)/onboarding/actions.ts`
- `app/(app)/dream/DreamWorkspace.tsx`
- `app/(app)/dream/actions.ts`
- `src/lib/engine/dream-clouds.ts`
- `src/lib/engine/decision-ripple.ts`

---

## 4. Phase 3 — Living Canvas, Atmosphere, and Atelier

The Living Canvas is a real three-room shell:

- Feast Studio
- Atmosphere Lab
- The Atelier

All three cards are available. In particular:

```text
Feast Studio → /canvas/feast → "Enter the Feast" → available: true
```

### Atmosphere

- Palette editing persists through `atmosphere_plans`.
- Deterministic ripple previews distinguish updated surfaces from preserved manual overrides.
- Surface previews and Canvas progress consume shared project state.

### Atelier

- Attire looks persist through `attire_looks`.
- Approvers come from editable workspace members rather than hard-coded bride/groom labels.
- Harmony and approval state use the shared palette and member model.

Primary files:

- `app/(app)/canvas/LivingCanvas.tsx`
- `app/(app)/canvas/page.tsx`
- `app/(app)/canvas/actions.ts`
- `app/(app)/canvas/atmosphere/*`
- `app/(app)/canvas/atelier/*`
- `src/lib/engine/atmosphere.ts`
- `src/lib/canvas/progress.ts`
- `supabase/migrations/0022_world_layer.sql`

---

## 5. Phase 4 — Connected modules, collaboration foundations, outputs, and planner

### Connected projections

The implementation connects decisions and project changes into the existing modules rather than
creating isolated prototype stores. Work touched:

- Money Map
- Timeline
- Guests
- Seating
- Documents
- Printables
- Private Guest Experience / website preview
- Decisions
- Peace Center

### Collaboration and freshness foundations

- Decision ripple preview and affected-object logic.
- Object comments and collaboration actions.
- Three-way merge helper for field conflicts.
- Local draft queue helper.
- Immutable output versions and stale-output detection.
- Updated save states, including device-only/sync/conflict language.
- Mobile seating improvements.

Primary files:

- `app/(app)/collaboration/actions.ts`
- `src/lib/collaboration/merge-conflict.ts`
- `src/lib/collaboration/draft-queue.ts`
- `app/(app)/outputs/actions.ts`
- `src/lib/outputs/freshness.ts`
- `src/lib/outputs/kinds.ts`
- `app/(app)/decisions/page.tsx`
- `src/components/decisions/*`
- `src/components/collaboration/*`
- `supabase/migrations/0023_collaboration_outputs.sql`

### Planner experience

The old Phase 4 note saying planner switching uses Clerk organizations is obsolete.

Current behavior:

- Supabase Auth owns identity.
- `public.users` links through `auth_user_id`.
- `workspace_members` controls each user's active workspaces and role.
- `tmp_active_workspace` selects the preferred membership.
- Planner Home lists workspaces from Supabase memberships.
- The planner-specific walk creates a client workspace with a `planner` membership.

Primary files:

- `app/(app)/planner/page.tsx`
- `app/(app)/planner/actions.ts`
- `app/(app)/planner/walk/*`
- `src/lib/workspace/current.ts`
- `src/lib/workspace/create.ts`
- `app/(app)/settings/page.tsx`
- `app/(app)/settings/actions.ts`

### Still not fully signed off

- Real two-browser/two-user presence and concurrent editing.
- A live same-base-version conflict walkthrough.
- Full offline → refresh → reconnect replay.
- Complete 390px and reduced-motion sweep across every Phase 4 module.

The foundations and routes exist; do not describe the remaining sign-off as missing implementation.

---

## 6. Phase 5 — Feast Studio is live

Feast Studio was deferred in Phase 3/4, then explicitly **un-deferred by**
`docs/phase-5/00-phase-5-plan.md`. The old gated-placeholder note is no longer true.

### Current routes

- `/canvas/feast`
- `/canvas/feast/flow`
- `/canvas/feast/guests`
- `/canvas/feast/requirements`
- `/canvas/feast/presentation`
- `/canvas/feast/scenes/[sceneId]`
- `/canvas/feast/brief`
- `/canvas/feast/brief/[versionId]/pdf`

### Implemented behavior

- Feast is the Living Canvas room, not a separate parallel product.
- One Feast Plan per workspace.
- Nine-scene meal flow with create/rename/reorder/duplicate/archive behavior.
- Dish editing with story, presentation, execution, service, mood, cost, and status.
- Guest requirements and requirement-to-dish assessments.
- Evidence recording for vendor confirmation and certification.
- Evidence-guarded deterministic hospitality coverage.
- Allergy ingredient compatibility does **not** become a safety claim.
- “Kosher style” does **not** satisfy a certified-kosher requirement.
- Assessment states remain:
  `unknown | ingredient_compatible | vendor_confirmed | certification_documented | conflict`.
- No UI status claims “safe.”
- Peace/coverage panel and next-action guidance.
- Service and presentation settings.
- Autosave plus local offline-draft support.
- Immutable caterer brief versions, changed-section detection, and PDF output.
- Loading and error boundaries.
- Feast progress is reflected in the Living Canvas.

Primary files:

- `app/(app)/canvas/feast/FeastRoute.tsx`
- `app/(app)/canvas/feast/FeastStudio.tsx`
- `app/(app)/canvas/feast/actions.ts`
- `app/(app)/canvas/feast/**/page.tsx`
- `src/lib/feast/store.ts`
- `src/lib/feast/hospitality.ts`
- `src/lib/feast/brief.ts`
- `src/lib/feast/offline-drafts.ts`
- `src/lib/feast/pdf.ts`
- `src/lib/feast/types.ts`
- `supabase/migrations/0024_feast.sql`
- `tests/hospitality.test.ts`
- `tests/feast-phase5.test.ts`

### Live showcase proof

The dedicated test workspace loaded successfully with:

- Feast Studio shell
- Nine meal scenes
- Ten seeded dishes
- Guest-care requirements
- Workspace-specific Feast data
- No browser console errors during the final verification

---

## 7. Supabase Auth and the backend-admin showcase account

> **Second account added 2026-07-25 — the agent admin.** `Claus@Peace.com` is a shared
> backend-admin login for Claude and Codex, used to confirm a deploy past the login screen
> (One-Engine-Redesign-Plan §26.1). Auth user `de8efd1a-fc6f-4b5b-a002-17d0db4ed2a8`; its own
> workspace `Claus & Claudia · Agent Admin`; two personas, Claus (Claude, owner) and Claudia
> (Codex, partner). Same rules as the account below: `backend_admin` in `app_metadata`, no RLS
> bypass, one workspace only. **The password lives only in `docs/access/claus-admin.md`, which
> is gitignored — it is not in this file, in `.env`, or in any tracked path.** End-to-end
> sign-in is unverified until the product is deployed.


This is a normal Auth login, not a client-side bypass or impersonation switch.

### Identity

- Login email: `missing@peace.com`
- Password: stored only in ignored `.env.admin-test.local`
- Do **not** copy the password into tracked documentation, commits, logs, or chat exports.
- Old email `backend-admin-test@example.com` was retired and verified rejected.
- Supabase Auth user ID:
  `9c22e3dd-faca-40e0-8151-e9e27d5714a6`
- `app_metadata.backend_admin = true`
- `app_metadata.test_account = true`

Authorization is intentionally read from server-owned `app_metadata`, never `user_metadata`.

### Security boundary

`backend_admin` does **not** bypass RLS and does not grant visibility into arbitrary couples' data.
The test account can use the whole engine because it is `owner` of one dedicated showcase workspace:

```text
Maya & Julian · Admin Test
```

The app shell shows:

```text
Backend admin · test
```

Primary files:

- `src/lib/auth/session.ts`
- `app/(app)/layout.tsx`
- `src/components/nav.tsx`
- `src/components/MobileNav.tsx`
- `tests/backend-admin.test.ts`

### Provisioner

`scripts/provision-backend-admin.ts` is idempotent and:

- finds the existing Auth user by stable user ID;
- updates email/password without creating a duplicate;
- verifies the new credentials;
- verifies the retired email is rejected;
- preserves `backend_admin` in `app_metadata`;
- syncs the public app user;
- ensures an owner workspace;
- seeds the showcase personalities, Dream, Compass, profile, and roles;
- prints IDs and verification flags, never the password.

The provisioner writes to the live Supabase project. Do not rerun it without Sid's approval.

---

## 8. Maya, Julian, and Aria showcase flavor

The dedicated admin workspace now uses the canonical prototype personalities:

| Person | Membership | Label | Character |
|---|---|---|---|
| Maya | `owner` | The dreamer | Started this whole thing. Wants warmth over show. |
| Julian | `partner` | Her person | Says yes to the big stuff. Guards the dance floor. |
| Aria | `planner` | Wedding planner | Keeps the peace. Protects the Compass they set. |

Maya is the real Supabase Auth test identity. Julian and Aria are fixture members in `public.users` and
`workspace_members`; they are **not separate Auth login accounts** yet.

The workspace profile and Dream/Compass are seeded with:

- Family and their people at the center.
- Warmth over show.
- One long, generous shared table.
- Music and dancing past midnight.
- Soft, candlelit, natural beauty.
- Ease and enough calm to remain present.
- Photographs that remember how the day felt.
- Golden-hour Fall 2027 context.
- Guest estimate 128; flexible showcase budget of 42,000.
- Family-style hospitality and the existing culturally aware Feast seed.

Verified in the rendered app:

- Settings shows Maya / owner / The dreamer.
- Settings shows Julian / partner / Her person.
- Settings shows Aria / planner / Wedding planner.
- Dream renders the family-first, warmth-over-show Compass.
- Feast displays `Maya & Julian · Admin Test`.

---

## 9. Migration state

Required order:

```text
0000_reset → 0001 … 0017 → 0018 → 0019 → 0020 → 0021 → 0022 → 0023 → 0024
```

Current evidence:

- Sid reported `0020`–`0023` already applied.
- The previous handoff records `0022` and `0023` applied live on 2026-07-23 with owner sign-off.
- `0024` tables are functionally present on the live backend: Feast loaded, seeded, and persisted through
  those tables. This handoff does not include a captured migration-ledger screenshot, so verify the
  migration history before any schema repair or re-application.
- `0018` and `0019` were expected to be present before the UI build. Their application was not
  independently re-proven from the migration ledger in this final handoff pass.
- Do not blindly reapply a migration. Inspect the live migration history first.

`supabase/migrations/0000_reset.sql` is synchronized with the Phase 3–5 tables and drops children before
parents:

- `caterer_brief_versions`
- `dish_assessments`
- `confirmation_evidence`
- `guest_requirements`
- `dishes`
- `meal_scenes`
- `feast_plans`
- `output_versions`
- `object_comments`
- `attire_looks`
- `atmosphere_plans`

Every Phase 3–5 workspace table has RLS in its creating migration.

---

## 10. Verification record

### Full application baseline after Phase 5 and admin-shell work

Run on the owner's machine:

- `pnpm typecheck` — passed.
- `pnpm test` — passed:
  - 19 test files passed
  - 1 integration file skipped
  - 114 tests passed
  - 4 environment-gated RLS tests skipped
- `pnpm build` — passed:
  - Next.js 15.5.19
  - 38 static/dynamic routes generated
  - Feast routes included

The build emitted the known non-fatal Supabase Edge Runtime warning from middleware. Compilation, type
checking, static generation, and build tracing all completed successfully.

### After the final email/persona provisioner extension

- `pnpm typecheck` — passed.
- `tests/backend-admin.test.ts` — 1/1 passed.
- Live provisioner verification:
  - Auth login verified
  - backend-admin claim verified
  - retired email rejected
  - workspace role verified as owner
  - Maya/Julian/Aria roles verified
- Rendered route checks:
  - `/canvas/feast`
  - `/peace-center`
  - `/canvas`
  - `/budget`
  - `/settings`
  - `/dream`
- No join/onboarding redirect for the test account.
- No browser console errors in the final Feast verification.

The latest change after the full suite/build was confined to the provisioning script and live seed data;
the repository typecheck and focused auth test were rerun afterward.

---

## 11. Local run and login

Current local endpoints:

- Sign in: `http://localhost:3100/sign-in?redirect=%2Fcanvas%2Ffeast`
- Feast Studio: `http://localhost:3100/canvas/feast`
- Settings/persona roster: `http://localhost:3100/settings`
- Dream/Compass: `http://localhost:3100/dream`

If the server is stopped:

```powershell
pnpm.cmd start --port 3100
```

That command requires a successful `.next` production build. Do not run `pnpm build` while this server is
still using `.next`.

The app has not been deployed. A localhost link is the only working product link at this handoff.

---

## 12. Remaining work before calling this launch-ready

These are the honest remaining gaps:

1. Full rendered visual review of all changed routes, not only the sampled showcase paths.
2. WCAG 2.2 AA audit, keyboard sweep, focus restoration, and reduced-motion verification.
3. Complete 390px mobile sweep, especially complex Feast editors, seating, and conflicts.
4. Real two-user Liveblocks/presence/comments session.
5. Live offline draft → refresh → reconnect → conflict exercise.
6. Cross-workspace RLS deny proof extended through `0022`, `0023`, and `0024` tables.
7. Migration-ledger confirmation for `0018`, `0019`, and `0024`.
8. Deployment target selection, environment review, commit strategy, push, and deployment.
9. Marketing funnel reconnection and deployment of the reconstructed homepage, if Sid wants it live.
10. Decide whether Julian and Aria should eventually receive separate Auth accounts for a multi-person demo.

Do not treat “showcase-ready locally” as “production-secure and deployed.”

---

## 13. Prototype and marketing state

- `prototype/Homepage.html` contains the reconstructed doorway hero, Four Layers, Dream-Cloud Compass,
  and Weaver close.
- `prototype/Homepage.pre-reconstruct-2026-07-22.html` is the backup.
- `HANDOFF-Homepage-Reconstruction.md` contains the homepage-specific notes.
- The reconstructed prototype has not been deployed in this wave.
- The authenticated product should continue moving toward prototype parity while retaining real
  persistence, permissions, RLS, and deterministic trust rules.

---

## 14. Standing guardrails

- Never expose the Supabase service-role key to client code.
- Authorization claims belong in `app_metadata`, not user-editable `user_metadata`.
- Backend-admin test identity must not become a cross-workspace RLS bypass.
- RLS policy ships in the same migration as every new workspace table.
- Keep `0000_reset` synchronized.
- Peace Note bodies never enter insights, comments, outputs, Feast, analytics, or collaboration payloads.
- Weaver remains cited, deterministic-guarded, bounded, and non-autonomous.
- Allergy and religious-certification language must say exactly what was checked; never claim “safe.”
- Immutable output/brief versions stay immutable.
- Generated material stays Draft and carries a Compass-tied rationale.
- Analytics remains opt-in and PII-scrubbed.
- Preserve manual overrides and label them.
- Do not commit, push, deploy, or mutate live schema without Sid's explicit approval.

---

## 15. Recommended resume sequence for Claude

1. Read this file and `docs/phase-5/00-phase-5-plan.md`.
2. Inspect `git status --short` and preserve the dirty tree.
3. Confirm the local production server before starting another build.
4. Treat Feast as implemented and live, not deferred.
5. Treat Supabase Auth/workspace membership as current; do not restore Clerk org switching.
6. Use the Maya/Julian/Aria workspace for showcase checks.
7. If touching the database, inspect migration history and obtain Sid's sign-off first.
8. Prioritize the remaining launch-hardening list or the next prototype-parity section Sid selects.
