# Restore point — commit Phases 2–5 before any further reconciliation work
> **Executed 2026-07-25.** Commit c5df4b9 created the Phase 2–5 restore point
> (109 files, 12,893 insertions, 2,638 deletions) after tests, typecheck, and the
> Cloudflare Pages product build passed. The later HomeLanding port, build stamp,
> parity canon, and deployment-target corrections were deliberately kept for the
> follow-up commit, preserving the boundary described below.

**Run this on your machine, not from the sandbox.** Git index writes fail over the Cowork device mount
(`unable to unlink '.git/index.lock': Operation not permitted`), and 40 files under `.claude/skills/`
read back as `Input/output error` through the mount — which is exactly why nothing here should stage or
commit on your behalf.

HEAD is currently `65af9c1` (2026-07-22). Everything from Phases 2, 3, 4 and 5 — mine and Codex's both —
is uncommitted: **54 modified files and 43 untracked paths**, including three migrations, the whole
`src/lib/feast/` tree, the collaboration and outputs layers, and eight test suites. There is no restore
point for three phases of work. This creates one.

---

## 1. Open a terminal in the repo

```
cd "C:\Users\siddi\Documents\The Missing Peace"
git branch --show-current      # expect: codex/update-prototype-from-zip
git log --oneline -1           # expect: 65af9c1 Rebuild homepage from Claude Design
```

If the branch or HEAD differs, stop and tell me before continuing.

## 2. Stage everything, then un-stage the line-ending noise

`.agents/` and `.claude/` show 2196 insertions / 2196 deletions with **zero content change** — it is pure
CRLF/LF churn from the mount. Keeping it out of this commit keeps the diff readable.

```
git add -A
git restore --staged .agents .claude
git status --short | head -40
```

Sanity check before committing:

```
git diff --cached --stat | tail -1
```

Expect roughly 95–100 files. If `.agents/` or `.claude/` paths still appear in `git status --short` under
the staged column, run `git restore --staged .agents .claude` again and re-check.

## 3. Commit

```
git commit -F docs/COMMIT-MSG-2026-07-25.txt
```

(The message file is written alongside this one. If you'd rather paste it, it's reproduced in §5.)

## 4. Confirm and push

```
git log --oneline -2
git push origin codex/update-prototype-from-zip
```

Do **not** deploy off the back of this commit yet — the deploy targets still collide on one Cloudflare
project name (that's the next task), and the homepage port isn't in this commit.

---

## 5. The commit message (also at `docs/COMMIT-MSG-2026-07-25.txt`)

```
Phases 2-5: engine, world layer, connected modules, Feast Studio

Restore point for three phases of work that had no commit boundary.
HEAD was 65af9c1 (2026-07-22); everything since sat in the working tree.

Phase 2 - Core engine
  Ripple emission at all five mutation points (compass, decision settle,
  vendor status, budget item, guest estimate); Weaver citation grounding
  and determinism guard; insight lifecycle persists acted_by/acted_at.
  src/lib/engine/ripple.ts, decision-ripple.ts, dream-clouds.ts + tests.

Phase 3 - World layer
  0022_world_layer.sql (atmosphere_plans, attire_looks; RLS in-migration).
  src/lib/engine/atmosphere.ts derivePaletteRipple + tests.
  Living Canvas shell, Atmosphere lab, Atelier.

Phase 4 - Connected modules, collaboration, planner
  0023_collaboration_outputs.sql (decision-ledger columns, object_comments,
  output_versions; RLS in-migration).
  src/lib/collaboration/, src/lib/outputs/, app/(app)/collaboration/,
  app/(app)/outputs/, app/(app)/planner/ + tests.

Phase 5 - Feast Studio as the Living Canvas Feast room
  0024_feast.sql (feast_plans, meal_scenes, dishes, guest_requirements,
  confirmation_evidence, dish_assessments, caterer_brief_versions;
  RLS in-migration on every table).
  src/lib/feast/hospitality.ts - the deterministic coverage engine.
  "Safe" is never a status: certified requirements need a documented
  certificate, allergies need vendor-confirmed preparation/cross-contact,
  and every confirmed state is evidence-guarded. 13/13 tests green.
  Feast Studio routes under /canvas/feast (scenes, guests, requirements,
  flow, presentation, brief).

Fixes from the 2026-07-25 provenance trace
  Feast Studio removed from the top-level nav - it is a Living Canvas room,
  not a peer section (src/components/nav.tsx).
  Living Canvas active state now matches any /canvas/* route, so Atmosphere,
  Atelier and Feast highlight the Canvas (nav.tsx, MobileNav.tsx).

Migrations 0022 and 0023 are applied to live (2026-07-23, with sign-off).
0024 is NOT yet applied - it needs sign-off, and 0000_reset needs its drop
lines first.

Not in this commit: the HomeLanding port, the Cloudflare project split, and
the prototype-vs-app parity backlog. See docs/TRACE-2026-07-25-how-we-fell-behind.md.

Excluded deliberately: .agents/ and .claude/ (CRLF-only churn, 2196/2196).
```

---

## 6. What this commit does *not* fix

- `app/page.tsx` → `src/components/landing/HomeLanding.tsx` still carries "Wedding Planning Engine",
  "Free to dream ✦", and "Free to dream · no sign-in ✦". The port is the next change.
- ~~All three wrangler configs are still `"name": "themissingpeace"`, and bare `pnpm deploy` still
  publishes the prototype over the product.~~ **Closed 2026-07-25.** The `deploy` alias is gone
  from `package.json`, and `cloudflare-prototype/wrangler.jsonc` now names
  `themissingpeace-prototype`. The remaining half of that defect moved to the Cloudflare project's
  git build settings — see section 7 and One-Engine §26.4.
- `0024_feast.sql` is not applied to live, and `0000_reset` is missing its drop lines:
  `caterer_brief_versions, dish_assessments, confirmation_evidence, guest_requirements, dishes,
  meal_scenes, feast_plans` (children before parents).

---

## 7. Push, then read the URL

Added 2026-07-25, after the owner directive that the URL to check is the one the push produces.
This repository has no GitHub Actions and does not use GitHub Pages: the Cloudflare Pages project
`themissingpeace` is wired to `kiddsiid/themissingpeace`, and the push is the deploy trigger.
One-Engine §26.4 is the canonical version of what follows.

```
git push origin codex/update-prototype-from-zip
```

`master` is the production branch, so a push to this branch produces a **preview** deployment, not
`themissingpeace.pages.dev`. Take its URL from the Cloudflare deployment or from the GitHub
deployment status on the commit — do not construct it by hand, because Cloudflare lowercases the
branch, swaps non-alphanumerics for `-`, and truncates, and the obvious guess
(`codex-update-prototype-from-zip.themissingpeace.pages.dev`) returns 404.

Then run the §26.1(3) check:

1. Open `<deployment-url>/version`.
2. Compare the short commit against `git log --oneline -1`. Equal means the deploy landed.
3. Sign in as the agent admin account (credentials in `docs/access/`, gitignored) to confirm the
   build gets past the login screen.

**Expect step 1 to fail until the Cloudflare settings change.** As of 2026-07-25 the git build is
still pointed at the prototype — root directory `cloudflare-prototype`, build command
`node ../scripts/prepare-prototype-pages.mjs`, output `dist` — so a push rebuilds the static
prototype and `/version` will not exist. `themissingpeace.pages.dev` is serving that prototype
right now, unresolved `{{ u.initial }}` placeholders and all.

The settings the product needs, which is a change on your Cloudflare account and therefore yours
to make:

> **Superseded 2026-07-26.** The deploy target moved from Cloudflare Pages to Cloudflare Workers
> and `pnpm run pages:build` no longer exists. See One-Engine §26.4 and `DEPLOY.md`. This record
> is left as written because it is the state at the time of the commit it documents.

```text
Root directory:          /                      (repository root)
Build command:           pnpm run pages:build
Build output directory:  .open-next/pages
```

plus the build variables and secrets listed in `DEPLOY.md`. Until then, `pnpm run deploy:product`
publishes the product manually — useful to see the build, but it is not what the gate reads.
