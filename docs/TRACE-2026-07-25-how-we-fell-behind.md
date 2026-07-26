# Trace — how the build ended up on an older engine

**Date:** 2026-07-25 · **Author:** Claude · **Repo:** `C:\Users\siddi\Documents\The Missing Peace`, branch `codex/update-prototype-from-zip`

You reported three things from the live app: a Feast Studio tab that shouldn't exist, sections showing
outdated tabs that were finished and pushed to `themissingpeace.pages.dev`, and a homepage from an older
build. All three are real. They are not three bugs — they are one process failure with three symptoms.

---

## 1. What is actually true right now

**Git.** HEAD is `65af9c1 Rebuild homepage from Claude Design`, dated **2026-07-22**. That is the newest
commit in the repository. Everything after it — Phases 2, 3, 4 and 5, mine and Codex's both — is sitting
uncommitted in the working tree: **54 modified files and 43 untracked paths**, including all three new
migrations (`0022`, `0023`, `0024`), the entire `src/lib/feast/` tree, the collaboration and outputs
layers, eight new test suites, and the reconstructed `prototype/Homepage.html`. There is no commit, no
tag, and no build artifact representing three phases of work.

**The live site.** `themissingpeace.pages.dev` right now still serves a homepage containing
`Begin the Dream Walk`, `Skip to the plan`, and `Free to dream`. None of those strings exist in the
reconstructed homepage, and none exist in the pre-reconstruction backup either. The deployed page is
older than every homepage file currently on disk.

**The build that was never shipped.** `.pages-prototype/index.html` was regenerated on **2026-07-23 at
22:50** and it *does* contain `Begin with the feeling` — the reconstruction. So `pnpm prototype:build`
ran. `pnpm prototype:deploy` never did. The new homepage has existed, built and correct, on the disk for
two days without reaching the URL.

**Three deploy targets, one project name.** Every wrangler config in the repo names the same Cloudflare
project:

| config | output | script |
|---|---|---|
| `wrangler.jsonc` (root) | `.open-next/worker.js` | `deploy:worker` |
| `cloudflare-pages/wrangler.jsonc` | `.open-next/pages` | `deploy:product` |
| `cloudflare-prototype/wrangler.jsonc` | `.pages-prototype` | `deploy` ← the default |

All three are `"name": "themissingpeace"`. The static marketing prototype and the Next.js product
overwrite each other at the same address, and the *unqualified* `pnpm deploy` publishes the prototype.
That is why the site "was showing the prototype" at one point and something else at another — the URL has
no stable owner.

**Two parallel products, never reconciled.** `prototype/*.html` is a complete, polished implementation
(Claude Design export, driven by `support.js` + `wedding-state.js`). The Next.js tree under `app/(app)/`
is a separate re-implementation. `docs/design/INDEX.md` names the deployed prototype as the canonical
design source — but no one ever took a page-by-page diff between the two. A spot audit of six sections
found the app is genuinely behind on four of them:

- **Money Map** — the prototype's *Protect & trim* panel (manual per-category protect toggle) and the
  *Auto-trim to fit* action are absent from `MoneyMapWorkspace.tsx`.
- **Seating** — the prototype's *Magic arrange* (Peacekeeper proposes a full seating with reasons, you
  confirm) and *Peacekeeper whispers* do not exist anywhere in `SeatingStudio.tsx` or `seating/actions.ts`.
- **Website** — dress code selector, the course-by-course menu with allergy note, and the Registry
  section have no fields or UI in the app.
- **Guests** — the prototype shows *Guest CRM* and *Guest website* as two views of one page with a live
  styled preview; the app splits the preview out to `app/w/[slug]/rsvp` with no in-app preview.

(Timeline and Vendors came back equivalent-or-ahead, so this is uneven, not a wholesale regression.)

**The Feast tab.** `src/components/nav.tsx` line 10 carried `{ href: '/canvas/feast', label: 'Feast
Studio' }` as a top-level sibling, and the Living Canvas active-state check listed `/canvas/atmosphere`
and `/canvas/atelier` explicitly — deliberately excluding `/canvas/feast`, so the tab lit up as its own
section rather than as a room. Feast had been made a fourth peer of the Canvas instead of a room inside it.

---

## 2. Where we fell short

**I took the design source of truth on faith.** `docs/design/INDEX.md` says the canonical design came
"from the deployed prototype at themissingpeace.pages.dev." I read that line, accepted it, and then wrote
every phase plan against the Next.js tree without once diffing the two. The prototype was the source of
truth in the documentation and nowhere in the process.

**My verification method was structurally blind to this class of defect.** What I actually verified across
Phases 2–5: SQL validated with pglast, pure logic executed under a vitest shim, esbuild parse sweeps,
contract checks that named symbols were imported by the right files, greps for forbidden strings. Every
one of those passes on a codebase whose navigation is wrong, whose panels are missing, and whose deploy is
two days stale. I reported "no discrepancies this round" from a method that could not have found any of
the three things you found in a minute of looking at the running app.

**I saw the evidence twice and under-weighted it twice.** When you sent your screenshots, the homepage on
disk turned out to be an *older* build than the one you were looking at — I logged that as a file-freshness
oddity and moved on. When I read `INDEX.md` and saw the deployed site named as the source of truth, I
logged that as documentation and moved on. Each was the same signal: the repository is behind the thing
you are actually looking at. Two data points, no escalation.

**I verified Phase 5's Feast wiring without re-reading the nav.** I checked the route, the card's
`available` flag, the imports, the tests. Codex had touched `src/components/nav.tsx` during Phase 4/5 and I
never opened it — the nav was outside the boundary I had drawn for myself, and the boundary was wrong.

**No commit, no deploy, no gate.** Three phases of work with no commit boundary means there was never a
moment where "is this actually what ships?" got asked. The build step ran; the deploy step didn't; nothing
in the process noticed, because nothing in the process was watching the URL.

---

## 3. Fixed already

`src/components/nav.tsx` — Feast Studio removed from the top-level `NAV` array. It is now reachable only
from the Living Canvas room card, as specified. `FeastStudio.tsx:538` already carries a "Back to Living
Canvas" link, so the room reads correctly as a room.

`src/components/nav.tsx` + `src/components/MobileNav.tsx` — the Living Canvas active-state now matches any
`/canvas/*` route, so Atmosphere, Atelier and Feast all highlight Living Canvas instead of nothing.

Nav is a pure client component with no test coverage referencing it, so this needs `pnpm typecheck` and a
visual pass, nothing more.

---

## 4. What still has to be decided

1. **Who owns `themissingpeace.pages.dev`** — the marketing prototype or the product? Until the three
   wrangler configs stop sharing one project name, whichever deploy ran last wins. Recommend: the product
   keeps `themissingpeace`, the prototype moves to a distinct project (`themissingpeace-prototype`), and
   the bare `pnpm deploy` alias is removed so nobody publishes by accident.
2. **The section-parity backlog.** Money Map's Protect & trim and Auto-trim, Seating's Magic arrange and
   Peacekeeper whispers, Website's dress code / menu / registry, and the Guests inline site preview are
   the confirmed gaps from a six-section sample. The remaining sections have not been diffed. Recommend a
   full prototype-vs-app parity sweep before any further feature phase, with the result written down as a
   ticket list rather than an assumption.
3. **Commit and deploy the current work.** Nothing since 2026-07-22 is committed. This must happen on your
   machine, not from here.
4. **A verification rule that would have caught this.** Every phase gate from here should require: the nav
   surface re-read after any phase that adds a route; a prototype-vs-app diff for every section the phase
   touches; and a confirmed deploy — the URL checked, not the build log.
