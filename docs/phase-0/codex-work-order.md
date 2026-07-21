# Codex Work Order — Phase 0 → 1 Boundary Work

**From:** Claude (product / architecture / review lead)
**To:** Codex (repository inspection / implementation lead)
**Based on:** `docs/phase-0/00-repository-audit.md` (+ the full Phase 0 set in `docs/phase-0/`)
**Date issued:** 2026-07-21

---

## 0. Read this first

The Missing Peace is **already a substantial full-stack app on the target stack** (Next 15 / Clerk / Supabase / Liveblocks / Cloudflare / Anthropic), not a prototype to rebuild. Your job in this work order is **boundary and hygiene work only** — reconcile the two codebases, clean the repo, and lock down secrets — so Phase 1 can start on solid ground.

**Governing principle: preserve and harden, do not rebuild.** Inspect before editing. No destructive rewrites. If you find yourself regenerating something that already works, stop and flag it.

**This work order stops at the Phase 0 gate.** Do the tasks below, write the handoff notes in §4, and hand back to Claude. Do **not** start Phase 1 feature work, migrations, RLS changes, or the creative modules.

---

## 1. Ground rules (landmines this project has already hit)

1. **Mount-staleness / truncation (has broken this build before).** The Cowork sandbox has served stale/truncated file sizes for files edited via file tools; a past folder move silently truncated files and broke the build.
   - Detect truncation with an **esbuild parse sweep**, not brace-counting or byte length:
     `find app src -name '*.ts*' | xargs -I{} esbuild {} --format=esm --jsx=automatic >/dev/null`
   - If you suddenly see many "Unexpected end of file" errors right after editing, **suspect the mount cache first** — verify the real file before "repairing" anything.
2. **Commit only on the owner's machine, never from the sandbox.** A sandbox commit can snapshot corrupted content. `push-to-github.bat` exists for the owner to run.
3. **Confirm the canonical path before any move or delete.** HANDOFF references `...\Documents\TMP`; the connected folder is `...\Documents\The Missing Peace`. Resolve which is real *first* (Task T1) or cleanup may hit the wrong tree.
4. **Archive, don't hard-delete, the Emergent scaffold.** Tag/branch it. Its frontend still holds Feast Studio / Atmosphere Lab / Caterer Brief concepts needed in Phase 4.
5. **Do not touch RLS or run migrations here.** The 0002-GUC vs 0003-Clerk-JWT split is intentional; the real RLS fix needs Clerk↔Supabase dashboard setup only the owner can do. Migrations are append-only and ordered (`0000_reset → 0001 → … → 0013`); leave them alone in this work order.
6. **Redact secrets in everything you output.** `git`/env command output can leak key values — mask them. Never commit `.env.local`.
7. **Keep `HANDOFF.md` current.** Append a dated session note when done. It is the memory across Claude↔Codex round-trips.

---

## 2. Tasks (ordered, with acceptance criteria)

Do them in order. Each has a boundary (`Do NOT`) and an acceptance check. Check the box only when the acceptance criteria are met.

### T1 — Verify the audit against the live repo (inspect, don't change)
- [ ] Confirm the canonical working path (`...\The Missing Peace` vs `...\TMP`).
- [ ] Confirm the local Next.js project builds and tests pass: `pnpm install`, `pnpm typecheck`, `pnpm test` (expect ~27 passing), `pnpm build`.
- [ ] Confirm the Emergent `backend/` (FastAPI/Mongo) and `frontend/` (CRA) are **not referenced** by the local Next.js app (no imports, no runtime dependency).
- [ ] Confirm `_reference_nextjs/` is a stale mirror of the local project (diff it; note anything newer there).
- **Do NOT** modify code in this task.
- **Acceptance:** a short written confirmation (or correction) of each bullet, with the canonical path stated and build/test results (redacted).

### T2 — Secrets hygiene (Risk R-1) — highest priority
- [ ] Confirm `.env.local` is git-ignored and **not** tracked in history (`git log --all -- .env.local` shows nothing).
- [ ] Confirm `.env.example` is the only env template tracked.
- [ ] If any secret was ever committed, list it (masked) and flag for rotation — do not attempt rotation yourself.
- **Do NOT** print full key values anywhere.
- **Acceptance:** statement that `.env.local` is ignored + untracked, or a masked list of exposures to rotate.

### T3 — One repo of record (Audit A-0)
- [ ] Establish the local Next.js project as the single source of truth in one canonical repository.
- [ ] Archive the Emergent scaffold (FastAPI backend + CRA frontend + Emergent Google Auth) on a clearly labeled tag/branch (e.g. `archive/emergent-scaffold`), **not** deleted.
- **Do NOT** delete the Emergent tree; **Do NOT** commit from the sandbox — stage changes for the owner to commit/push on their machine (`push-to-github.bat`).
- **Acceptance:** the canonical repo/branch is named; the archive ref is named; a note on exactly what the owner must run to commit/push.

### T4 — Repo hygiene (untrack cruft)
- [ ] Ensure `.gitignore` covers and nothing tracks: `.next/`, `.open-next/`, `.wrangler/`, `tsconfig.tsbuildinfo`, `cloudflare-env.d.ts`, `tmp/`.
- [ ] Untrack the committed archives: `_deploy/themissingpeace-pages.zip`, `The Missing Peace.zip`.
- [ ] Remove `_reference_nextjs/` and the `tmp/claude-prototype-*` working folders (after T1 confirms nothing newer lives there).
- [ ] Consolidate the three deploy configs (`cloudflare-page/`, `cloudflare-pages/`, `cloudflare-prototype/`) to **one product target + one demo target**; note what each mapped to.
- **Do NOT** remove `prototype/*.html` yet — that retires in Phase 6 with the demo adapter; only stop tracking build output/cruft here.
- **Acceptance:** `git status` (redacted) shows the cruft untracked/removed; a one-line rationale per removed/consolidated item; esbuild parse sweep still clean.

### T5 — Bring product docs in-repo
- [ ] Ensure `North Star`, `Build Plan v2`, `HANDOFF.md`, and the `docs/phase-0/` set travel with the code under `/docs`.
- **Acceptance:** the docs are under `/docs`; links in `docs/phase-0/README.md` still resolve.

### T6 — Re-verify and record
- [ ] Run the esbuild parse sweep and the test suite once more after all changes.
- [ ] Append a dated session note to `HANDOFF.md` summarizing what changed.
- **Acceptance:** sweep clean, tests green (report counts), HANDOFF updated.

---

## 3. Explicitly out of scope (Phase 1+, do not start)

RLS enforcement / proving Wall 2 · running or writing migrations · the ripple layer (`ripple_events`) · Weaver maturity (citations/states/audit) · Dream Walk redesign · the Planner Experience · Feast Studio / Atmosphere Lab / Atelier · the cinematic marketing site / demo adapter · motion/3D · analytics. These are sequenced in `docs/phase-0/07-migration-plan.md`.

---

## 4. Handoff notes to send back to Claude (required format)

When done, return notes with these sections (this is what Claude needs to reconcile against Phase 0 and write the Phase 1 plan):

1. **What was built/changed** — exact file paths added / moved / deleted.
2. **What was intentionally preserved** — and why.
3. **Where the audit was wrong or outdated** — anything verified against the live repo that contradicts `00-repository-audit.md` (e.g., `.env.local` status, whether the local project builds clean, whether the Emergent backend is truly unreferenced, anything newer inside `_reference_nextjs/`).
4. **Confirmed answers** to the two open questions: canonical path, and secrets status (ignored? any exposure to rotate?).
5. **Commands run + results** — typecheck / test (counts) / build / esbuild sweep — **secrets masked**.
6. **What you deferred or were blocked on** — and why.
7. **Exact steps the owner must run** to commit/push on their machine.
8. **Remaining risks** and your **recommended next step**.

---

## 5. Definition of done for this work order

One repo of record established; Emergent scaffold archived (not deleted); `.env.local` confirmed ignored + untracked (exposures flagged for rotation); repo cruft untracked/removed; deploy configs consolidated; docs under `/docs`; esbuild sweep clean; tests green; `HANDOFF.md` updated; handoff notes (§4) written. **No feature work started. Stopped at the Phase 0 gate.**
