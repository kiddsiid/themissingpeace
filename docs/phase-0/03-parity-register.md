# 03 — Prototype Parity Register

**Purpose:** map every important behavior in the public prototype to its production counterpart, so the prototype can become a **truthful seeded demo of the real product** and never implies functionality the live engine cannot support (directive non-negotiables #5, #21, #26).

## How the prototype works today (the honesty problem)

The prototype is ~15 standalone `.html` files (`Homepage`, `Dream Walk`, `Dream`, `Board`, `Peace Center`, `Peace Notes`, `Feast Studio`, `Money Map`, `Seating Studio`, `Guests`, `Vendors`, `Timeline`, `Documents`, `Playlist`, `Honeymoon`, `Website`, `Printables`, `Decisions`, `Demo`, `Privacy`, `Terms`) sharing three scripts: `wedding-state.js` (a `WeddingState` object persisted to **`localStorage`**), `support.js`, `mobile.js`. It is deployed as a **separate Cloudflare Pages site** from the real app.

**The risk this creates:** the prototype can *look* like a working, saving product while nothing is persisted server-side, no collaboration is real, and no AI is actually running. That is exactly what the directive forbids. Every row below therefore carries a **Honesty flag** describing what the demo may and may not claim.

**Target model:** replace the standalone HTML with **demo mode inside the real app** — the actual React components rendered against a **demo adapter** that serves fixtures (`src/lib/demo/*`). A persistent, visible "Seeded demo — nothing here is saved" affordance distinguishes: *seeded data* · *preview behavior* · *real saved data* · *real collaboration* · *production outputs*.

---

## Parity table

Legend — **Prod status:** ✅ built · ⚠️ partial · ❌ not built. **Honesty flag:** what the seeded demo may claim.

| Prototype behavior | Production counterpart (route / module) | Prod status | Honesty flag for demo |
|---|---|---|---|
| Homepage narrative / entry | `(marketing)` cinematic story → begin Dream Walk | ⚠️ (marketing is separate HTML) | Real story; CTA starts the *real* free Dream Walk. No fake testimonials/counts. |
| Dream Walk questionnaire | `/onboarding` + `/dream` (redesigned Dream Walk) | ✅ / ⚠️ redesign | Demo may show the journey and a sample Compass, labelled "example." Real Dream Walk saves for signed-in users. |
| Dream Clouds gathering | `/dream` `DreamWorkspace.tsx` | ✅ | Real interaction; in demo the clouds are seeded, drag doesn't persist. |
| Wedding Compass reveal | `wedding_compass` + Compass service | ✅ | Demo Compass is illustrative; only a saved account persists it. |
| Peace Center dashboard | `/peace-center` | ✅ | Seeded recommendations/risks are labelled seeded; "Run Peace Engine" in demo returns a canned run, not a live AI call. |
| One decision → ripple | Ripple service + `ripple_events` (NEW) + explainable UI | ❌ | **Do not fake.** Build the real ripple first; demo shows the *real* computed ripple over fixtures. |
| Board / Living Canvas | `/board` | ✅ | Real component; demo board is seeded, Poof in demo is preview-only (no DB write). |
| Poof (inspiration → decision/vendor/budget) | `poof.ts` + `board_item_links` | ✅ | Demo shows the confirm/edit step; commit is disabled/simulated with a "seeded" badge. |
| Feast Studio (menu, dietary, caterer brief) | `/feast` module (NEW) + tables | ❌ | Migrate as real module before demoing; until then, mark "coming" — do not present a non-existent surface as shipped. |
| Atmosphere Lab (palette/lighting/florals/tablescape) | `/atmosphere` module (NEW) + tables | ❌ | Same — build first, then seed. |
| Atelier (attire/looks/harmony/dress code) | `/atelier` module (NEW) + tables | ❌ | Same — build first, then seed. |
| Money Map budgeting | `/budget` | ✅ | Real ranges/fit; demo numbers are fixtures. Always show benchmark source; never exact promises. |
| Seating Studio | `/seating` | ✅ | Real drag/seat; demo chart is seeded, changes non-persistent. |
| Guests / RSVP | `/guests`, `/w/[slug]/rsvp` | ✅ | Demo guest list seeded; public RSVP writes are real only on a real published page. |
| Vendors | `/vendors` | ✅ | Seeded vendors; no real outreach. |
| Timeline | `/timeline` | ✅ | Seeded roadmap. |
| Documents | `/documents` | ✅ | Demo shows the surface; no real uploads in demo. |
| Playlist | `/playlist` | ✅ | Seeded tracks; hearts non-persistent in demo. |
| Honeymoon | `/honeymoon` | ✅ | Seeded trip. |
| Public Website | `/website`, `/w/[slug]` | ✅ | Demo previews a sample public page at a sandbox slug. |
| Printables | `/printables`, `/print/[kind]` | ✅ | Real generation from seeded data is fine (output is genuinely produced). |
| Peace Notes | `/peace-notes` | ⚠️ | **Never** show a real locked body. Demo uses obviously-fake placeholder notes only. |
| Partner collaboration / presence | Liveblocks + `workspace_members` | ✅ (board) / ⚠️ (app-wide) | Demo may *simulate* a second cursor but must label it "simulated collaborator," not a real person. |
| Weaver insight | Weaver service (`lib/ai`) | ⚠️ | Demo insights are pre-generated fixtures labelled "example insight," not live AI output. |
| "Saved" states / account | Supabase persistence | ✅ (real app) | Demo must show a persistent "nothing is saved in demo — create an account to keep this" affordance. |
| Pricing / early access | `(marketing)` early-access reservation | ⚠️ | Reservation may collect an email; **no payment processing** in the core milestone; no false scarcity or fake social proof. |

---

## Rules the demo must obey (from the directive)

1. **Same components, vocabulary, design system, and interaction patterns** as production — the demo renders the real modules, not a parallel HTML clone.
2. **No prototype interaction without a named production counterpart.** Every row above with ❌ must be built before it appears in the demo.
3. **Clear four-way distinction always visible:** seeded data · preview behavior · real saved data · real collaboration/production outputs.
4. **No fabricated testimonials, customer numbers, unresolved template variables, fake AI behavior, or fake saved states** (non-negotiable #26).
5. **The prototype must never imply seeded data is persisted** in production (Phase 6 gate).

## Migration note

Retire the standalone `prototype/*.html` + `wedding-state.js` app after the demo adapter renders the real components. Keep the prototype's *copy and imagery* as source material for the cinematic marketing site and the design system, not as a running application.
