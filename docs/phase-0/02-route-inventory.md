# 02 — Route & Module Inventory

**Purpose:** enumerate every current route in the canonical Next.js app, map it to the directive's module list, and mark status + gaps. Routes are from `app/**`.

---

## 1. Authenticated app routes — `app/(app)/*`

| Route | Module (directive) | Status | Notes / gap |
|---|---|---|---|
| `/onboarding` | Dream Walk (entry) | Working | Real first-run form + Clerk org + seed. Needs the Dream Walk *redesign* (one-question journey, live world response, plain-English rules). |
| `/dream` | Dream Walk / Dream Clouds | Working | `DreamWorkspace.tsx` — Dream Clouds orbit, drag-to-prioritize persisted to `dreams.responses_json.cloudPriorities`, Compass approval. |
| `/peace-center` | Peace Center | Working | Compass hero, Peace Score, Next Best Actions (owner+reason+module+action), Decision Queue, Risk Radar, Vendor Gaps, Money Map pressure, Guest impact, activity. Has "Run Peace Engine." |
| `/board` | Design Studio / Living Canvas | Working | Gallery + Canvas (Liveblocks), Poof menu, Master Vision auto-assembly, smart tags, mood extraction, Present mode. tldraw/react-moveable. |
| `/budget` | Money Map | Working | Money Map over the old budget page: location/guest/target/type inputs, fit reading, estimate→quoted→committed→paid, milestones, contributions, scenarios. |
| `/decisions` | Connected Decisions | Working | Options + one-vote-per-person, final choice + rationale, linked Dream value, full status set. |
| `/timeline` | Timeline | Working | Roadmap + Run-of-Day, milestones, explicit task dependencies. |
| `/vendors` | Vendors | Working | Full vendor fields incl. contract/deposit/availability/day-of logistics (0010). |
| `/guests` | Guests | Working | Households + guests, RSVP+meal, dietary/travel/plus-one, views (awaiting/coming/traveling/needs-address), meal tally, song→playlist. |
| `/seating` | Seating Studio | Working | Flagship: draggable tables on a room, per-seat assignment, household seating, celebration state. Pure geometry lib + 11 tests. |
| `/documents` | Documents | Working | Folders, file upload + signed download, contract status/due/linked vendor/decision. |
| `/playlist` | Playlist | Working | By moment, per-user hearts, attribution, per-song approval status. |
| `/honeymoon` | Honeymoon | Working | Trip hero + dream composer grouped, activity hearts. |
| `/website` | Public Website (studio side) | Working | Create/publish page, slug/welcome/toggles, share links, guest-album moderation. |
| `/printables` | Printables | Working | Escort/place cards, table numbers, seating sign, menus, save-the-date, invitation — from live data. |
| `/peace-notes` | Peace Notes | Partial | Types exist; schema has encryption + lock resolver + strict RLS. Directive/HANDOFF flag "finish service/UI carefully — do not leak locked bodies." |
| `/settings` | Workspace / planner switch | Partial | Clerk `<OrganizationSwitcher/>` for multi-wedding. Per-member roles UI + client-facing planner permissions still open. |

## 2. Public + system routes

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing (storybook) | Working (in-app). To be superseded by the cinematic `(marketing)` story. |
| `/sign-in`, `/sign-up` | Clerk auth | Working; `forceRedirectUrl` → onboarding / peace-center. |
| `/w/[slug]` | Public wedding website | Working; Master-Vision-styled; exposes only names/date/welcome/mood. |
| `/w/[slug]/rsvp` | Public RSVP + contact-collector | Working; writes into Guest CRM; published+open gated. |
| `/w/[slug]/photos` | Guest photo album | Working; image-only ≤8MB, couple moderation. |
| `/print/[kind]` | Printable render targets | Working; `@media print` + Print button. |
| `/api/liveblocks-auth` | Liveblocks room tokens | Working; validates `board:{id}` vs membership. |
| `/api/webhooks/clerk` | Clerk→Supabase sync | Working; users/orgs/memberships. |
| `/guests/export` | Guest CSV export | Working (route handler). |

## 3. Module coverage vs. the directive's 16 + 2 experiences

**Directive's engine modules → current status:**

1. Peace Center — ✅ built
2. Dream Walk — ✅ built, ⚠️ needs redesign
3. Design Studio & Living Canvas — ✅ built (as `/board`)
4. Feast Studio — ❌ **missing in app** (concept represented in prototype materials)
5. Atmosphere Lab — ❌ **missing in app** (concept represented in prototype materials)
6. Atelier — ❌ **missing everywhere as code** (directive requirement; prototype concept only)
7. Guests — ✅ built
8. Seating Studio — ✅ built (flagship)
9. Timeline — ✅ built
10. Money Map — ✅ built
11. Vendors — ✅ built
12. Documents — ✅ built
13. Playlist — ✅ built
14. Honeymoon — ✅ built
15. Public Website & Printables — ✅ built
16. RSVP & private guest experiences — ✅ built (RSVP, photos); Peace Notes ⚠️ partial

**Cross-cutting the directive requires → status:**

- Weaver AI (bounded/cited/auditable) — ⚠️ partial (single JSON call; no citations/states/audit UI)
- Ripple effects (visible + explainable) — ❌ recommendations/risks exist, explicit **ripple events + explainable UI** do not
- Two experiences (Couple vs Planner) — ❌ one shared shell + org switcher; **no role-specific Planner portfolio** (client list, cross-wedding attention, briefs, deadlines)
- Persistent app shell w/ command palette, mobile drawer — ⚠️ nav exists; command palette + full mobile drawer + app-wide presence not confirmed
- Analytics/observability surface — ❌ not present

## 4. The build-ahead, distilled

The **operational and creative-collab core is largely built** (14 of 16 modules working). The concentrated gaps are:

1. **Three creative modules:** Feast Studio, Atmosphere Lab, Atelier (Phase 4).
2. **Ripple layer:** persist `ripple_events` and render the explainable "one change → six consequences" UI the whole product promises (Phase 2/4).
3. **Weaver maturity:** citations, confidence, approve/dismiss/edit/defer, audit trail, and every loading/empty/failed/stale/retry state (Phase 2 onward).
4. **Planner Experience:** a real second experience — portfolio, cross-client attention, client-workspace entry/return, briefs, templates (Phase 3+).
5. **Dream Walk redesign:** the gravitational-center journey + plain-English language system (Phase 2).
6. **Public cinematic site + truthful demo mode** (Phase 6).
7. **Motion/3D, analytics, and the proof layer** — GSAP/R3F, event taxonomy, RLS/a11y/perf tests (Phases 7–8).
