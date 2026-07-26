# Prototype → App parity: the full ticket list

> **Superseded appendix — 2026-07-25.** These tickets have been folded into the single
> canonical backlog at `docs/design/One-Engine-Redesign-Plan.md` §26 (see §26.2 for the
> section-to-MP mapping). Build against MP-### there, not against the letter codes here.
> This document is kept for two things it holds and §26 does not: the per-section
> **AHEAD (do not regress)** lists, and the record of the two findings withdrawn on
> inspection (F-1 and `/board`).

**Date:** 2026-07-25
**Branch:** `codex/update-prototype-from-zip`
**Method:** twelve parallel source sweeps, every `prototype/*.html` page diffed against its `app/(app)/*` route.
**Companion docs:** `docs/TRACE-2026-07-25-how-we-fell-behind.md` (root cause), `docs/COMMIT-2026-07-25-restore-point.md` (restore point).

---

## How to read this

Every ticket below is a **user-visible thing the prototype does that the app does not**. Each section also carries an **AHEAD** list — capabilities the Next.js app has that the prototype never had. The AHEAD lists are not decoration: they are the regression guard. Any ticket implemented by "port the prototype markup over" would delete them. The instruction on every ticket is *add the prototype's surface on top of the app's engine*, never *replace the app with the prototype*.

**One caveat that applies to every ticket below.** The sweep read source, not a running app, and the two claims I checked by hand both turned out softer than the sweep reported (see `/board` and Feast, immediately below). Before building any ticket, open the page. Some of these will already be there.

Severity is about the user's experience of the page, not implementation cost:

- **Blocker** — the page's stated promise does not work. The reason someone opens this page is absent.
- **Major** — a signature moment or readout is missing; the page functions but reads as a different, lesser product.
- **Minor** — a chip, a count, a label, a piece of texture.

**Nothing in this document has been built.** This is the review list, per the "full sweep, then a ticket list" decision. Ordering below is my proposed sequence; the ordering is yours to change.

---

## `/board`: not the decision I thought it was

I had this queued as a product decision requiring your call. Having read the actual route tree, it mostly isn't one, and I'd rather say so than hand you a question that doesn't need answering.

The sweep agent diffed `prototype/Board.html` against `app/(app)/board/` and reported them as two different products sharing a route name. That comparison was against the wrong route. **The prototype's three-room Design Studio already exists in the app — it is the Living Canvas.** `app/(app)/canvas/LivingCanvas.tsx` defines exactly the three rooms, with the prototype's own copy:

- `feast` → `/canvas/feast` — "The table" · **Feast Studio** · "Build a meal every guest can enter, understand, and enjoy." · *Enter the Feast*
- `atmosphere` → `/canvas/atmosphere` — "The feeling" · **Atmosphere Lab** · "Design the feeling before anyone says a word." · *Enter the Lab*
- `atelier` → `/canvas/atelier` — "The story worn" · **The Atelier** · "Design the story your love will wear." · *Enter the Atelier*

It has the Peace Panel and per-room progress. So the Design Studio was built, correctly, and shipped as `/canvas`.

Meanwhile `/board` is the Master Vision pin board — and **it is not in the sidebar nav at all** (`NAV` in `src/components/nav.tsx` has `/canvas` labelled "Living Canvas"; there is no `/board` entry). It is an unlinked route.

So the real question is much smaller: **`/board` is currently unreachable from the UI. Should it be linked, folded into the Living Canvas as a fourth room, or left as a deep-link-only surface?** That is worth a decision, but it is not a product fork, and it does not gate any other ticket. The Board items the sweep listed as missing — the Dream Drawer/"Pantry", the completeness meter, "Ripple through the world ✦", the eight surface previews, "✦ Conjure from the {role}", "Bless this" approvals, "Couple harmony" — should be re-diffed against `/canvas` and its three rooms before any of them are written as tickets. **I have not done that re-diff, and I am not going to guess at it.** It is the one gap in this document.

---

## FEAST — the tab that started this

**Here is the thing worth reading twice: the app is already right.**

There is no top-level Feast Studio tab in the codebase. `NAV` has seventeen entries and Feast is not among them. The Feast Studio lives at `/canvas/feast`, mounted inside the Living Canvas as its "table" room — which is exactly where you said it belongs.

So the Feast Studio tab you are looking at live is not a thing to remove from the code. **It is the stale deployment.** `themissingpeace.pages.dev` has been serving the prototype (or an old build) because `pnpm deploy` aliased to `prototype:deploy`, which carried no `--project-name` and inherited `themissingpeace` from its wrangler config — publishing the static prototype straight over the product's Pages project. That single mechanism explains every symptom in your report at once: the Feast tab, the outdated sections, and the old homepage. It is fixed in `package.json` and `cloudflare-prototype/wrangler.jsonc` as of today, but **the live URL stays wrong until the product is deployed.** That deploy is the fix for what you're seeing, and it is yours to run.

**AHEAD (do not regress):** scene management, requirements CRUD, the evidence dialog, brief gating, presentation view, offline/conflict handling.

| # | Severity | Ticket |
|---|---|---|
| ~~F-1~~ | — | ~~Remove the top-level Feast Studio tab.~~ **Not a ticket — already correct in code.** Feast is at `/canvas/feast` inside the Living Canvas. Resolved by deploying the product. |
| F-2 | Major | **Layout modes are missing entirely:** Studio / Journey / Focus. The app renders one fixed layout. |
| F-3 | Major | **The ripple preview sheet is gone** — "This will ripple into…" with **Dismiss** / **Accept & apply**. The app writes ripples but never shows the user what a change is about to do before they commit it. |
| F-4 | Major | **Per-group care cards with inline record actions** — the app has the evidence dialog but not the at-a-glance card per guest group. |
| F-5 | Major | **Hospitality band labels** absent from the group headers. |
| F-6 | Minor | **Templates rail** missing. |
| F-7 | Minor | **"Suggest a dish"** and **"Add a family tradition"** actions missing. |
| F-8 | Minor | **"Caterer brief · {pct}"** toolbar button and the **brief readiness bar** missing. |

### F-9 — evidence grade is invisible on a confirmed pill — Minor

I want to correct something I noted earlier in this project, because I had it wrong and it would have sent someone to "fix" a model that is correct.

There are two type layers in `src/lib/feast/hospitality.ts`, and I conflated them:

- `AssessmentState` — per dish, per requirement — is the five-value set: `unknown | ingredient_compatible | vendor_confirmed | certification_documented | conflict`.
- `Coverage` — the rollup the UI renders — is a separate, deliberate five-value set: `unknown | needs_review | compatible | confirmed | conflict`.

So **"Needs review" is not an invented sixth state.** It is the state that encodes the single most important rule on this surface — `// ingredients alone ≠ safe`, `coverageForRequirement` line 92 — and `CoveragePill` renders `Coverage` faithfully, all five values, no more. The certification rule is also correctly enforced: for a requirement that needs certification, vendor word does not reach `confirmed`, it stays `unknown`. No partial credit. That is right.

**What is actually worth a ticket** is narrower. For a safety-critical allergy, `vendor_confirmed` and `certification_documented` both roll up to `confirmed` and render the same pill — **"Confirmed with evidence"** — so on screen, *"the caterer told us over the phone"* and *"we hold the certificate"* are indistinguishable. That is correct per spec (an allergy needs preparation/cross-contact confirmation, and vendor word satisfies it) but it is thin when the caterer brief goes out to a venue. Surface the evidence grade — a second line on the assessment card, or a distinguishing mark on the pill. **Change the display, not the model.**

Also worth a look: the Peace Panel chip **"Cared for"**. It is borderline against the "'safe' is never a status" rule and probably wants scoping to the specific requirement rather than to the person.

### F-10 — SAFETY: two live "safe" strings found, one fixed today

The earlier sweep reported the app as clean. **It was not**, and the miss is instructive: the sweep looked at the Feast surface and the prototype, and the violation was sitting in the Living Canvas seed data.

`src/lib/canvas/seed.ts` line 38, on the autumn squash soup:

> "Verify the vegetable stock is certified gluten-free and no cream is finished in. **Safe for nearly every table when confirmed.**"

That is the exact claim the product is not allowed to make, and the "nearly every" hedge makes it worse rather than better — it asserts safety while quietly disclaiming the guests it might not cover. **Fixed today**; it now reads "Once both are confirmed the ingredients clear vegan, gluten-free, dairy-free and nut-free — preparation and cross-contact still need the caterer's word."

Line 31 was left alone deliberately: "Contains dairy, gluten & nuts. Not safe as-is for nut-allergy or vegan guests." Warning of a hazard is not certifying safety, and stripping that sentence would make the product less careful, not more. A re-sweep of `app/` and `src/` now returns only legitimate matches — `motion-safe:`, `env(safe-area-inset-*)`, "type-safe", the hazard warning above, and the deliberate disclaimer `"Safe" is intentionally not a status.`

**The prototype is still dirty.** `prototype/Feast Studio.html` carries "nut-safe" at lines **440, 465, 614, 622, 646, 647**. If any of that markup gets ported during this parity work it brings the forbidden claim with it. Strip these six at the source **before** anyone ports from that file — do not rely on catching them in review, because that is precisely what did not happen last time.

---

## PEACE NOTES — `/peace-notes` is a stub — Blocker

The route file is literally annotated `Stub — see docs/HANDOFF.md.` and renders a title and one line. **The entire page is unimplemented.**

Missing: the note grid, the composer, the seal/unseal mechanic with its four seal targets, the counter chips, the kind filters, inline editing, and the plum ambience.

Constraint that governs this build: **Peace Note bodies never leak** — not into insights, not into comments, not into outputs, not into any collaboration surface. The seal mechanic is the point of the page, and it is the easiest thing in the repo to get wrong.

| # | Severity | Ticket |
|---|---|---|
| PN-1 | Blocker | Build the note grid and composer. |
| PN-2 | Blocker | Build the seal/unseal mechanic with all four seal targets. |
| PN-3 | Major | Counter chips, kind filters, inline editing. |
| PN-4 | Minor | Plum ambience. |

---

## DREAM / DREAM WALK

**AHEAD:** persistence, real state.

| # | Severity | Ticket |
|---|---|---|
| D-1 | Blocker | **The whole 8-question Dream Walk was replaced by a single chip row + slider board.** The walk — including "＋ add your own fragment" and the 2–300 intimacy slider — does not exist in the app. This is the page's entire reason to exist. |
| D-2 | Major | **"Your Compass reads" bottom bar** with **"Approve this Compass ✦"** and **"Revisit"** — the approval moment is missing, and Peace Center references it. |
| D-3 | Major | **"＋ Add a dream" / "Wish it into the sky"** preset popover missing. |
| D-4 | Major | **"Make it real — choose where it lands"** and the **"✦ Real"** badge missing — dreams cannot be promoted into the plan. |
| D-5 | Minor | **Season** and **"The light"** chip rows missing. |
| D-6 | Minor | **"Our palette"** widget missing. |
| D-7 | Minor | **"Let this dream drift away"** (the gentle delete) missing. |
| D-8 | Minor | **Rank labels differ.** Prototype: North star / Held high / Held close / Drifting / Real (five). App: four. Pick one vocabulary and use it everywhere, including the new homepage compass. |

---

## MONEY MAP

**AHEAD:** setup form, forecast, Money Flow pipeline, scenarios.

| # | Severity | Ticket |
|---|---|---|
| M-1 | Major | **"Protect & trim"** and **"Auto-trim $X to fit ✦"** missing — confirmed. The single most-cited absence. |
| M-2 | Major | **Per-category ◇/◆ protect toggles** missing (the mechanic "Protect & trim" acts on). |
| M-3 | Major | **The funds-gathered equation band** missing. |
| M-4 | Major | **Stacked allocation bar** and **committed/paid dual bars** missing. |
| M-5 | Major | **Inline editable planned amounts** — the app requires a form round-trip. |
| M-6 | Minor | **Vendor link chips** on categories missing. |
| M-7 | Minor | **Editable / removable contributor rows** missing. |
| M-8 | Minor | **One-tap "Mark paid"** missing. |

---

## SEATING

**AHEAD:** Undo seat, Arrange Mode, zoom, conflict check.

| # | Severity | Ticket |
|---|---|---|
| S-1 | Blocker | **"✨ Magic arrange"** and its **"A seating, arranged with love"** modal missing — confirmed. This is the page's headline capability. |
| S-2 | Major | **"Peacekeeper whispers"** missing — confirmed. |
| S-3 | Major | **Meal-colored seats and avatars**, **VIP ★** and **child** markers missing — the plan is unreadable at a glance without them. |
| S-4 | Major | **"On this table" roster** missing. |
| S-5 | Major | **Ceremony arch, aisle and side labels** missing — ceremony seating cannot be laid out. |
| S-6 | Minor | **Meal-count-seated tally** missing. |
| S-7 | Minor | **Pool filter chips** and **table shape switcher** missing. |
| S-8 | Minor | **Reset** missing. |
| S-9 | Minor | **Celebration petals** missing. |

---

## GUESTS

**AHEAD:** household/guest CRUD, context cards, 26-column CSV export.

| # | Severity | Ticket |
|---|---|---|
| G-1 | Blocker | **The "✦ Guest website" mode is gone entirely**, taking the whole guest-facing RSVP flow with it: search → form → thanks, the hero, section nav, details cards, travel card, song field, address capture, and the thank-you states. Guests cannot RSVP. *(Overlaps W-3 below — the app does have working public RSVP and album pages on `/website`; the decision is whether the guest-facing flow lives there or here. It should not live in both.)* |

---

## TIMELINE

**AHEAD:** persistence and CRUD. **Correction to an earlier note in this project's history: Timeline and Vendors are materially _behind_, not equivalent-or-ahead. The app gained persistence and CRUD and lost the signature readouts of both pages.**

| # | Severity | Ticket |
|---|---|---|
| T-1 | Major | **The date / dream-state band** missing: "Still a dream", "No date yet — and that's okay", **"Set our date ✦"**. |
| T-2 | Major | **"The road ahead · {n}/{m} milestones reached"** journey spine missing. |
| T-3 | Major | **"Tasks in motion"** with its completion bar and **one-click task toggle** missing. |
| T-4 | Minor | **"the order of the day is still a dream"** empty state missing. |
| T-5 | Minor | **Run of Day header block** missing. |

---

## VENDORS

| # | Severity | Ticket |
|---|---|---|
| V-1 | Major | **"Your guiding five" constellation** missing — Venue ⌂, Caterer ✦, Photographer ◎, Officiant ❦, Florist ✿, with **"{n} of 5 secured"**. |
| V-2 | Major | **Five-stage pipeline ribbon** and **"Advance →"** missing — there is no way to move a vendor through stages in one gesture. |
| V-3 | Minor | **Per-card progress bar** missing. |
| V-4 | Minor | **Booked toast** missing. |

---

## WEBSITE

**AHEAD:** Guest Experience private preview, slug editor, working public RSVP + album pages.

| # | Severity | Ticket |
|---|---|---|
| W-1 | Major | **Live browser preview frame** missing — you cannot see the site as a guest sees it while editing. |
| W-2 | Major | **The public "The day" details grid** missing. |
| W-3 | Major | **"The menu"** — with its allergy note and plated callout — missing. *(Must be built against the hospitality model, not free text. Same rule: "safe" is never a status.)* |
| W-4 | Minor | **Registry** missing. |
| W-5 | Minor | **Dress code picker** and **"What to wear"** missing. *(Related: the prototype's dress-code + attire rules live in the Board's Atelier — see the Board decision above. Build once, surface in both.)* |

---

## DECISIONS

**AHEAD:** decision CRUD, ripple preview dialog, conflict resolution, offline queue, ledger + history, comments and presence. This is one of the app's strongest surfaces — be careful here.

| # | Severity | Ticket |
|---|---|---|
| DC-1 | Major | **"Set in peace" sealed gallery** with the wax-seal animation missing, along with one-tap **"Set in peace ✦"** and **"Revisit"**. The page has no moment of resolution. |
| DC-2 | Major | **Constellation star voting** with Maya/Julian vote avatars and **"Shining brightest"** missing. |
| DC-3 | Minor | **"☁ protects · {dream}"** chips missing — the visible link back to the Compass. |
| DC-4 | Minor | **Stat cards** and the **"Every maybe has found its peace"** empty state missing. |

---

## DOCUMENTS

| # | Severity | Ticket |
|---|---|---|
| DO-1 | Blocker | **The whole signature workflow is missing** — "Send for signature" / "Sign", and the signer chips. Contracts cannot be executed. |
| DO-2 | Major | **Notifications panel** missing. |
| DO-3 | Minor | **Share / Email** actions missing. |
| DO-4 | Minor | **Filter chips** and **counter tiles** missing. |

---

## PRINTABLES

| # | Severity | Ticket |
|---|---|---|
| PR-1 | Blocker | **The live paper preview sheet is missing** — which is the entire point of the page. |
| PR-2 | Blocker | **"Print / Save PDF ↗"** missing — nothing can be printed. |
| PR-3 | Minor | **Single-select chooser rail** missing. |

---

## HONEYMOON

| # | Severity | Ticket |
|---|---|---|
| H-1 | Major | **Postcard hero** missing. |
| H-2 | Minor | **Trip date range** and **nights count** missing. |
| H-3 | Minor | **"Our wish" tile** missing. |

---

## PLAYLIST

| # | Severity | Ticket |
|---|---|---|
| PL-1 | Major | **Most-loved sorting** missing — which is the page's stated promise. |
| PL-2 | Major | **First-dance vinyl hero** missing. |
| PL-3 | Minor | **Approved count** missing. |
| PL-4 | Minor | **Approved-vs-proposed row styling** and the **"Do not play"** card treatment missing — the two states are visually identical today. |

---

## PEACE CENTER

**AHEAD, substantially:** citations, insight lifecycle, Risk Radar, Ripples, InviteCircle. The engine work here is well beyond the prototype. What is missing is the readout.

| # | Severity | Ticket |
|---|---|---|
| PC-1 | Major | **"What builds your peace" factor grid** and the numeric **Peace Score dial** missing — the score exists but is never shown as a score. |
| PC-2 | Major | **"Mark done ✓"** and the **"{N} to do · {M} done"** counter missing. |
| PC-3 | Minor | **"You're all caught up"** empty state missing. |
| PC-4 | Minor | **Money Map pressure bar** and **Compass approval line** missing (depends on D-2). |
| PC-5 | Minor | **Toasts** and the **"Listening…"** running state missing — the engine runs with no visible sign of life. |

---

## LANDING — `#founding` was deliberately not ported — Major

When I rebuilt the homepage from `prototype/Homepage.html`, I ported everything **except** the `#founding` access section, and it should not be silently dropped.

It is an offer grid driven by `window.TMP_LANDING` plus a lead form that POSTs to `/api/lead`, backed by **D1 and Stripe** in the prototype's Cloudflare Pages project.

| # | Severity | Ticket |
|---|---|---|
| L-1 | Major | Port `#founding`. Needs a Next API route (`app/api/lead/route.ts`), a Supabase table with **its RLS policy in the same migration**, and the offer config moved off `window.*` into server-rendered props. Stripe secret via `wrangler pages secret put STRIPE_SECRET_KEY` — **never** in `wrangler.jsonc`. |

---

## Cross-cutting

| # | Severity | Ticket |
|---|---|---|
| X-1 | Major | **One rank vocabulary.** D-8 above is a symptom: Dream, the homepage compass and Decisions each use a slightly different set of status words. Choose one set, put it in `src/lib/`, and import it everywhere. |
| X-2 | Major | **The ripple preview sheet exists in Decisions and is missing in Feast** (F-3). It should be one component used by both, not two implementations. |
| X-3 | Minor | **Every new table introduced by these tickets needs its RLS policy in the same migration**, and `0000_reset` kept in sync. This is the `rls_auto_enable` deny-all lesson; it applies to L-1 and to anything PN-* introduces. |

---

## Proposed order

1. **Deploy the product.** Not a ticket, and the highest-value action available: it fixes the Feast tab, the outdated sections and the old homepage in one move, because all three are the same stale deployment. Create the `themissingpeace-prototype` Pages project first so the next `pnpm prototype:deploy` has somewhere to land.
2. **Re-diff Board against `/canvas`** before writing Board tickets — and spot-check two or three other sections the same way. If they come back like Feast did, this list gets meaningfully shorter.
3. **Blockers on pages that currently cannot do their job:** PR-1/PR-2 (nothing prints), DO-1 (nothing gets signed), PN-1/PN-2 (the page is a stub), S-1 (Magic arrange), D-1 (the Dream Walk), G-1 (guest RSVP — after resolving the overlap with W).
4. **F-10's prototype cleanup** — strip the six "nut-safe" strings from `prototype/Feast Studio.html` *before* any porting starts, not after. **F-9** can ride along with any Feast work.
5. Everything marked Major, by section.
6. Minors, batched per page so each page gets one visual pass rather than eleven.

---

## Tally

**80 tickets: 9 blockers, 36 majors, 35 minors** — after F-1 was withdrawn as already-correct. One item (the `seed.ts` "safe" string) is already fixed. The Board section is deferred pending a re-diff against `/canvas`.

Eight of the nine blockers are pages that cannot currently do the thing their name promises — nothing prints on Printables, nothing gets signed on Documents, Peace Notes is a stub, guests cannot RSVP, the Dream Walk does not exist. If that holds up under the spot-checks in step 2, this is not a polish backlog. But treat the number as an upper bound: the two claims I verified by hand both came back smaller than the sweep reported, and I would expect that pattern to continue.
