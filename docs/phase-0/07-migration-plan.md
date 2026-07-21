# 07 — Migration Plan

**Purpose:** the ordered, gated path from today's reality (one strong Next.js engine + a divergent Emergent scaffold + a standalone `localStorage` prototype) to the directive's end state (one hardened engine, two role-specific experiences, a truthful seeded demo, and a cinematic public site). Mapped to the directive's Phases 1–8. Every phase ends with the directive's nine-part report and stops at its gate.

**Governing principle:** *preserve and harden, do not rebuild.* Migration is subtractive on the Emergent side and additive-plus-hardening on the Next.js side.

---

## Phase 0 → 1 boundary work (do first, before feature work)

These close the structural risks and cost little:

- **A-0 One repo of record.** Push the local Next.js project to a single canonical repository. Archive the Emergent scaffold at a tagged commit. Stop editing two trees. (R-3)
- **Confirm the canonical working path** (`...\The Missing Peace` vs `...\TMP`) and align scripts/docs. (R-12)
- **Secrets hygiene.** Verify `.env.local` is ignored; scan history; rotate exposed keys; document the Cloudflare build-vs-runtime env split. (R-1)
- **Repo hygiene.** Untrack build artifacts/zips; delete `_reference_nextjs/` and `tmp/claude-prototype-*`; consolidate the three `cloudflare-*` configs to one product + one demo target.
- **Move product docs into `/docs`** (North Star, Build Plan v2, HANDOFF, this Phase 0 set) so intent travels with the code.

## Phase 1 — Foundation (hardening)
**Goal:** the shell, tokens, auth, workspace, data access, and observability are production-grade.
- Extract a named **design-system** primitive layer from the existing tokens (`tailwind.config.ts`, `globals.css`): Button, Card, Arch, DreamCloud, Field, Dialog, Drawer, with full component/accessibility states.
- **Prove RLS** (R-2): complete Clerk↔Supabase third-party auth, run `0003`, route reads through `supabaseForUser()`, add the explicit unauthorized-access test.
- Harden the app shell: persistent Compass access, mobile navigation drawer, save/sync states, error boundaries, keyboard nav, semantic landmarks, page titles.
- Stand up **observability** (Cloudflare observability + error tracking) and a **skeleton analytics emitter** (taxonomy defined in Phase 8; events stubbed now).
- **Gate:** a user can create/enter a workspace securely and see persistent data; RLS proven by test; secrets clean.

## Phase 2 — Core engine (complete the loop)
**Goal:** Dream → Compass → connected decisions → **ripple** → Next Best Actions is fully real and explainable.
- **Dream Walk redesign** (R-16): one-question journey, live world response, gravity (earlier answers shape later ones), earned Compass reveal (guiding sentence, 3 priorities, choice summary, one ripple, one next action, partner invite, edit path). Keep Compass persistence + Dream Clouds.
- **Language & Content System** (R-14): plain-English rules applied across questions/buttons/warnings/outputs; define branded terms on first use.
- **Ripple layer** (R-8): add `ripple_events`, a ripple service, and the explainable "one change → many consequences" UI; wire module writes to emit ripples.
- **Weaver maturity** (R-4): citations to supporting records, confidence/uncertainty, approve/dismiss/edit/defer, audit trail, and every loading/empty/failed/stale/retry/preserved-edit state; move the model id and prompt loading to config/build-time; precise progress messages ("Comparing the menu against 6 dietary needs").
- Finish `generateWorkspace` TODOs: seed milestones from a roadmap template; fire the first engine run on onboarding.
- **Gate:** enter a Dream, generate a Compass, save it, change a decision, and see the impact reflected elsewhere — with a cited Weaver explanation.

## Phase 3 — Collaboration & Money Map + the Planner seat
**Goal:** two people (and a planner) work the same workspace with accurate shared state; budget guidance is Compass-aligned; the second experience begins.
- Partner/planner invitations, presence beyond the board (app-wide), optimistic updates, conflict handling, version history, activity history, offline/reconnect behavior.
- Money Map depth: commitments, due dates, contributions, Compass-aligned warnings (largely built — verify and extend).
- **Planner Experience v1** (R-15): `app/(planner)` portfolio (client list, cross-wedding attention: deadlines/vendor gaps/approvals/budget pressure/timeline risk), enter-client-workspace/return-without-losing-context, planner-scoped capabilities + planner-org model + `client_links` (data model §3).
- **Gate:** two collaborators see accurate shared changes; a planner sees cross-client attention and can enter a client workspace on the same records.

## Phase 4 — Creative engine (close the module gaps)
**Goal:** the three missing creative surfaces exist on the shared model and produce connected consequences.
- **Feast Studio**: menus/courses/dishes + normalized dietary requirements + caterer brief + guest plate preview + guest-care warnings + advisory cost guidance. (Port concepts from Emergent CRA; build against the canonical schema.)
- **Atmosphere Lab**: palette/lighting/florals/tablescape/invitations/website appearance/cake relationships + ripple previews.
- **Atelier**: look selector/composer, couple & party harmony, attire rules, guest dress-code output.
- Each declares its data contract (data model §2) and emits ripples/Weaver insights.
- **Gate:** creative decisions produce visible connected consequences and useful outputs (e.g., a dietary change updates the caterer brief and Money Map food category).

## Phase 5 — Operational engine (depth + polish)
**Goal:** vision → practical outputs without leaving the engine.
- Depth passes on Guests, Seating (Peacekeeper suggestions, room objects, ceremony rows), Timeline, Vendors, Documents, Playlist, Honeymoon; finish **Peace Notes** service/UI safely (never leak locked bodies, R- Peace Notes).
- Public output versioning; digital send flow for save-the-dates/invitations; hotel/travel section on the public site.
- **Gate:** a couple can move from vision to practical outputs end-to-end.

## Phase 6 — Prototype & public experience (truthful)
**Goal:** the cinematic marketing story and the seeded demo, both honest.
- Build `app/(marketing)` cinematic story (Threshold→Dream→Compass→Ripple→Shared→Engine→Invitation) with purposeful scroll choreography.
- Build `app/(demo)` seeded demo over the **real components** via a demo adapter; always-visible seeded/real distinction; retire the standalone `prototype/*.html` app. (R-13)
- Conversion hierarchy: free Dream Walk → Compass → save with email → invite partner → explore → early access (email only; no payments, R-18).
- **Gate:** the prototype communicates the real product with no false persistence/AI/social-proof claims.

## Phase 7 — Motion & 3D refinement
**Goal:** enhancement that never damages usability.
- GSAP/ScrollTrigger for public scroll scenes; Framer Motion for app transitions; Three.js/R3F for threshold + select studio surfaces — one animation system per interaction.
- Reduced-motion support; static/simplified fallbacks for every 3D scene; lazy-load; Draco/KTX2; measure on low-powered mobile. (R-7)
- **Gate:** visual enhancement leaves usability, a11y, loading, and mobile performance intact.

## Phase 8 — Hardening & launch
**Goal:** production readiness proven with evidence.
- Security review (RLS test green, secrets clean), accessibility review (axe + keyboard + SR), performance testing (LCP<2.5s / INP<200ms / CLS<0.1 on real devices), migration verification, analytics verification (taxonomy live, privacy-conscious, consented), error/device/deployment testing, launch checklist.
- **Gate:** the Definition of Done is demonstrated with evidence, not assumed.

---

## Migration safety rules (apply every phase)
1. Inspect before editing; preserve user changes; no destructive rewrites; small phases; keep docs current.
2. **Never commit from the sandbox** — commit on the owner's machine (mount-staleness, R-5).
3. Migrations are append-only and ordered; `0000_reset` stays in sync; every migration pglast-valid before it lands.
4. End every phase with the nine-part report and stop at the gate. Never claim unverified functionality.
