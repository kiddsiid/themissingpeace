# The Missing Peace — North Star (2026-07-06)

The Missing Peace exists to replace planning.wedding, Joy (withjoy.com), and Aisle Planner.
When the owner says "interactive playground" or "wedding planning engine," the reference point
is **planning.wedding on steroids**: everything that makes planning.wedding beloved — instant,
tactile, free-feeling, collaborative tools — wrapped around an intelligence layer none of them
have. This document governs prioritization. Build Plan v2 remains the module spec; where this
document expands scope (seating chart, guest surfaces), this document wins.

## What we are replacing

**planning.wedding** (highest rated — the benchmark). Its power is the *instant playground*:
no signup required, collaborators join by link without accounts, and every tool is tactile and
immediately useful. Crown jewels: the drag-and-drop **seating chart and ceremony layout maker**
(their most-loved feature by testimonial volume), the guest-list→RSVP→**printables pipeline**
(place cards, escort cards, table numbers, menus, programs, welcome signs generated straight
from planning data), a wedding website with guest photo uploads, timeline/itinerary templates,
a budget calculator, a vendor directory, and an AI agent. Free with a business portal and
white-label as the model.

**Joy** (2nd). The guest-facing layer at scale: wedding websites (600+ templates), Smart RSVP
with arbitrary custom questions, a contact-collector "magic link" that fills the guest list by
itself, zero-fee cash/honeymoon registry, save-the-dates and invitations (digital + print),
hotel room blocks, and a matching mobile app.

**Aisle Planner** (3rd). The professional side: CRM and lead management, branded proposals,
contracts with e-signature, payments, CAD layouts, client portals, granular permissions,
multi-event management.

## Where The Missing Peace already wins (the "steroids")

None of the three have anything like our intelligence and emotional layer. These are the moat
and must stay ahead of everything else in polish:

The **Dream → Wedding Compass → Peace Engine** loop (values-driven planning; Peace Score; Next
Best Actions with reasons). The **Money Map** (benchmarked cost intelligence with likely ranges,
fit readings, pressure points, and Compass-aligned tradeoffs — their budget tools are dumb
calculators). The **Board → Poof → Master Vision** conversion surface (inspiration becomes
vendors, decisions, money, timeline; approvals auto-assemble the Master Vision; mood extraction
feeds the Compass — for them, inspiration is a dead gallery). **Decisions with voting**, Peace
Notes, and the enchanted, storybook feel throughout.

The rule: every feature we take from the competitors gets rebuilt *through* this engine, never
as a bolted-on utility. Their seating chart seats people; ours knows dietary needs, households,
VIPs, and the Compass. Their RSVP counts heads; ours feeds Money Map guest-count pressure and
the Peace Engine.

## Scope decisions (owner-approved 2026-07-06)

1. **Seating chart + ceremony layout: IN SCOPE, flagship priority.** Supersedes Build Plan v2
   §26. Built on the existing guest CRM (households, RSVP, meals). Drag-and-drop tables and
   seats, ceremony rows, tactile and beautiful — the single feature we must decisively beat
   planning.wedding on.
2. **Guest-facing surfaces: CORE to the vision.** Public wedding website, guest RSVP page
   writing into the Guest CRM, and guest photo uploads become first-class modules fed by the
   Guest CRM and the Master Vision (the approved aesthetic should style the website).

## The gap map (what they have that we don't — prioritized)

**Wave A — the playground gap (beat planning.wedding at its own game):**
✅ Seating chart / ceremony layout studio (flagship — shipped 2026-07-06, migration 0012).
✅ Public RSVP page + wedding website, Master-Vision-styled (shipped 2026-07-06, migration 0013).
✅ Printables pipeline: escort cards, place cards, table numbers, seating sign, menus,
save-the-date, invitation — generated from live data (shipped 2026-07-06).
◻ Instant-start feel: minimize friction before the magic moment (guest/demo mode or sandbox).

**Wave B — the Joy gap (reach the guests):**
✅ Contact-collector magic link — built into the public RSVP flow (shipped 2026-07-06).
✅ Guest photo album with guest uploads + couple-side moderation (shipped 2026-07-06).
✅ Save-the-dates / invitations from the Master Vision aesthetic — print/PDF (shipped
2026-07-06); ◻ digital send flow (email) still open.
◻ Hotel/travel block info on the website (data already in guest CRM travel fields).

**Wave C — the Aisle Planner gap (the planner seat):**
✅ Multi-wedding workspace switcher in Settings (shipped 2026-07-06).
◻ Client-facing permissions, planner annotations. Later: proposals/contracts/payments if we
ever court professionals seriously.

**Continuous — keep widening the moat:**
Board Overhaul wave 3 (reactions, approval policy, widgets, magic arrange, mobile stack view).
Peacekeeper surfaces everywhere (seating suggestions from households/dietary; website copy
drafts; printable copy). Money Map depth. Peace Center as the single "what matters now" answer.

## Acceptance standard

A couple who has used planning.wedding should, within ten minutes of The Missing Peace, feel
that everything they loved is here — the seating chart is more fun, the RSVP page is more
beautiful, the printables are one click — and then discover things planning.wedding never
dreamed of: the app *knows* their wedding, protects what they said mattered, turns their
Pinterest chaos into a plan, and tells them the next best thing to do with love. That is
"planning.wedding on steroids."
