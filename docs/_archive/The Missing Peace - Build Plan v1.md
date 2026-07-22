# The Missing Peace — Engineering & Product Build Plan (v2)

**What changed in v2 (the repositioning):** The Missing Peace is now a **Wedding Planning Engine**, not "a board." The board is the *creative surface*; the **Peace Engine** is the *intelligence layer*. Two new first-class pieces enter the plan: the **Dream Layer** (which produces the **Wedding Compass**) at the front of the loop, and the **Peace Engine** (which turns meaning + inspiration into a living plan and keeps it aligned with the Dream) running underneath everything. Home is renamed the **Peace Center**. The core loop, data model, phases, and acceptance criteria below are updated accordingly; the Peace Notes layer (v1.x) is retained intact.

> **Product promise:** *"Turn the dream into the plan, and keep the plan aligned with what matters."*
> **Category:** a Wedding Planning Engine — a private collaborative workspace that translates wedding inspiration and planning inputs into structured decisions, timelines, budgets, vendor requirements, guest rules, and next best actions.

**Scope of this document:** the *core loop, deep*. Everything serves one loop. This plan defines that loop precisely, the minimum data model + conversion engine + intelligence layer to make it real and magical, and a phase-by-phase task breakdown that front-loads the loop before the surrounding modules. The remaining modules (full guest CRM, honeymoon, planner mode) are covered at the structural level so nothing in the schema or architecture has to be reworked later.

**Source of truth:** *The Missing Peace Product Specifications* (54 pp) + *Product Update* (Wedding Planning Engine / Peace Engine). Where this plan resolves an ambiguity it is flagged as a **Decision**. Where the spec says "version one," this plan treats it as MVP scope.

**How to use it:** Sections 2–6 are the spine — read these first and build against them. Section 7 is the phased task list (hand to Codex / engineering). Section 8 maps every MVP acceptance criterion back to a build task so "done" is unambiguous.

---

## 1. The one-sentence product

> The Missing Peace is a **Wedding Planning Engine** that turns your wedding **Dream** into a living plan for every decision, vendor, guest, date, dollar, and detail — and keeps that plan aligned with what matters.

Three forces make the product, and each maps to a layer: **the Board gives beauty** (the creative surface), **the Dream gives meaning** (the Wedding Compass), and **the Peace Engine gives movement** (the intelligence that constantly answers *"what should we do next, and why?"*). The board is still one of the most important parts of the experience — but it is the *surface*, not the *category*. Win condition: the board feels magical, the poof feels inevitable, and the engine makes the wedding *make sense*. Do not build a bloated wedding OS before that is true.

---

## 2. The Core Loop (the spine)

The entire MVP is one repeating loop. In v2 the loop is **bookended by the Dream**: it begins by defining what the wedding *means* and continually checks the plan back against that meaning. The **Peace Engine** runs underneath every stage, turning inputs into next best actions.

```
  DEFINE THE DREAM ─▶ COLLECT ─▶ POOF ─▶ DECIDE ─▶ TRACK ─▶ CHECK vs DREAM ─▶ UPDATE
        │  (Wedding Compass)                                        │              │
        │                                                           ▼              │
        └────────────────────  PROTECT THE PEACE  ◀──── Peace Engine (always on) ◀┘
```

| Stage | What the user does | Primary surface | Primary objects |
|---|---|---|---|
| **Define the Dream** | Answer Dream prompts: meaning, priorities, traditions, non-negotiables, things to avoid | Dream onboarding | `dreams`, `wedding_compass` |
| **Collect** | Paste a link, upload an image/PDF, drop a screenshot, write a note; organize (drag, group, tag) | Board (Add item flow) | `board_items`, `link_previews`, `board_item_positions` |
| **Poof** | Convert an item into a real plan object (engine may *suggest* the poof) | Poof menu | `vendors`, `tasks`, `budget_items`, `decisions`, `events`, `documents`, `honeymoon_items` |
| **Decide** | Discuss, vote, approve/reject; resolve a decision with a final choice | Item drawer / Decisions | `decisions`, `decision_votes`, `decision_approvals` |
| **Track** | Watch status move toward done across budget/vendors/guests/dates | Peace Center / module lists | `tasks`, `budget_items`, `vendors`, `guests`, Peace Score |
| **Check vs Dream** | Compass Check: does this choice still match the Dream? | Peace Center / Compass Check | `wedding_compass`, `planning_risks` (dream_mismatch) |
| **Update / Protect the peace** | Re-run the engine on change; keep the plan aligned and calm | Peace Engine (always on) | `planning_engine_runs`, `planning_recommendations` |

**The loop is the product.** Three things make it more than a Pinterest clone: (1) every board item can **poof** into a plan object via a bidirectional link (still the single most important relationship — §4, §5); (2) the **Dream/Compass** gives every choice something to be measured against; and (3) the **Peace Engine** turns a passive workspace into an active system that always knows the next best action. Beauty + meaning + movement.

### 2.1 State machines that drive the loop

These three state machines are what turn "inspiration" into "progress." Implement them as Postgres enums and enforce transitions in the service layer.

**Board item lifecycle** (lightweight — the item's *section* is the visible status; this is the internal disposition):
```
captured → organized → discussing → approved ──▶ poofed
                          │            │
                          └──▶ rejected └──▶ archived
```
- `captured`: just added, unplaced or in Dream/Maybe.
- `approved`: a couple/planner explicitly blessed it (the "vow to the plan").
- `poofed`: it has spawned ≥1 plan object. Item stays on the board, now badged "set in peace" with a link to its child object(s). Poof is **not** destructive.

**Decision lifecycle** (the differentiator — turns ambiguity into a recorded choice):
```
open → discussing → needs_vote → needs_planner_input → approved
                                                          │
                          deferred ◀──┘   rejected ◀──┘   changed (re-opens with history)
```
- An `approved` decision is locked into the planning record but remains editable; every edit writes an `audit_events` row. "Final choice," "rationale," "approved_by," "date_approved" are required to enter `approved`.

**Task lifecycle** (the "track" engine):
```
not_started → in_progress → waiting → needs_decision → done
                                                       skipped
```
- `needs_decision` is the bridge back to the Decisions module: a blocked task points at the decision that must resolve first.

**Peace Note lock lifecycle** (the emotional layer — see §6½ — runs *alongside* the loop, attaching meaning to its objects):
```
draft → saved ──▶ locked ──▶ unlockable ──▶ opened
                    │
                    └──(no lock)──▶ readable
```
- `locked`: a date-locked or event-locked note (wedding day / anniversary). Body is encrypted-at-rest and never returned by the API until the unlock condition is met.
- `unlockable`: the lock date/event has passed; the note surfaces a gentle "ready to open" affordance.
- A Peace Note is not part of the action loop (it never becomes a task/vendor/budget item) — it is the *why* behind the loop. The one place it touches the loop is the **"why we chose this" memory**, which attaches to a board item, decision, vendor, or other domain object (§6½, §5.4).

**Peace Engine recommendation lifecycle** (the engine proposes; humans dispose):
```
new → accepted → completed
  │      │
  │      └──▶ deferred ──▶ (re-surfaced on next relevant run)
  └──▶ dismissed
```
- A recommendation is a *suggestion*, never an action taken on the couple's behalf. Accepting a recommendation may *create* a loop object (a task, a poof) but always with a human in the loop.

**Peace Engine risk lifecycle:** `open → acknowledged → resolved` (or `dismissed`). Risks are advisory flags (budget, guest-count, timeline, vendor-gap, dream_mismatch, …), never blockers.

### 2.2 Loop invariants (build these as tests)

1. Every plan object created via Poof stores `source_board_item_id`; every board item that has been poofed exposes its children.
2. Approving an item or resolving a decision is reversible with full history (no hard deletes of approval state).
3. Any loop action a user can take on desktop, they can take on mobile (the loop is not read-only on phones — see §9).
4. Nothing in the loop crosses a workspace boundary (RLS, §4.4).
5. A Peace Note is never visible to anyone but its author unless explicitly shared (partner) or explicitly granted (planner), and a locked note's body is never served before its unlock condition is met — *even to the author, even to platform admins* (§4.4, §6½).
6. The Peace Engine never takes an irreversible action autonomously: it only produces recommendations, risks, and Compass Checks. Every state change to a real plan object still flows through a human and the normal permission checks.
7. Every Peace Engine output traces to a `planning_engine_run` and is reproducible: deterministic facts (budget math, overdue tasks, missing vendor categories) come from rules; only meaning/judgment comes from AI (§6).

---

## 2½. The engine and its ten layers (product architecture)

The Missing Peace is structured as an engine with connected layers. Each layer has one job and one main output; the Peace Engine (§6) reads across all of them. This is the conceptual map — the tech stack that implements it is §3.

| # | Layer | Job | Main output | Lives in plan as |
|---|---|---|---|---|
| 1 | **Dream** | Capture meaning, emotional priorities, cultural values, traditions, non-negotiables, things to avoid | **Wedding Compass** | §4.5, Phase 1 |
| 2 | **Inspiration** (Board) | Collect & arrange links, pins, uploads, color, venues, attire, food, honeymoon ideas | Organized board items convertible into actions | §4.2, §5, Phase 2 |
| 3 | **Decision** | Track open/approved/deferred/rejected/changed decisions | Decision clarity + approval history | §4.3, Phase 3 |
| 4 | **Planning** | Generate timeline, tasks, milestones, next actions, priorities | A living wedding roadmap | §4.3, §6, Phase 3/6 |
| 5 | **Budget** | Advisory budget, estimates, quotes, committed costs, category pressure, risk | Financial awareness (no payments in v1) | §4.3, Phase 3 |
| 6 | **Vendor** | Categories, shortlists, inquiries, quotes, contracts, booking status | Vendor progress + missing-vendor gaps | §4.3, Phase 3 |
| 7 | **Guest** | Households, count, invite rules, RSVP, meals, dietary/accessibility, travel | Guest clarity + hospitality planning | §4.3, Phase 3 |
| 8 | **Document** | Store contracts, quotes, invoices, mood sheets, menus, floor plans, notes | Organized planning records | §4.3, Phase 3 |
| 9 | **Collaboration** | Real-time partners/planner/collaborators: comments, votes, approvals, mentions, permissions, activity | Shared planning without scattered chats | §4.1/§4.4, Phase 5 |
| 10 | **Peace** | Check plans against the Wedding Compass; warn when the wedding drifts from the Dream | Emotional alignment | §6 Compass Check, Phase 6 |

The flow in one line: **Dream creates meaning → the Board captures inspiration → the Peace Engine turns meaning + inspiration into a plan → the Compass Check protects alignment → the Peace Center shows what matters next.**

---

## 3. Architecture — decisions to lock now

The spec recommends a stack; this section commits to it and flags the few choices that materially affect the core loop. Use latest stable majors at build time and pin them.

**Frontend:** Next.js (App Router) · React · TypeScript · Tailwind · a custom design-system layer on top of shadcn/ui · Framer Motion for the poof animation and subtle transitions only.

**Board rendering — Decision:** use **tldraw** (or a thin custom canvas over its primitives) for the desktop/tablet spatial canvas, with **Liveblocks** as the realtime/storage/presence layer. Rationale: the spec's required board behaviors (free placement, resize, group, stack, live cursors, presence, real-time movement, conflict handling, undo/redo) map directly onto tldraw + Liveblocks and avoid hand-rolling CRDT conflict handling. Board *item content* (the rich cards) are React components rendered into the canvas; their *authoritative data* lives in Postgres, with Liveblocks storage holding ephemeral/positional state.

**Source-of-truth split — Decision (important):**
- **Postgres (Supabase)** is the durable record for all domain objects: items' metadata, vendors, budgets, decisions, guests, etc.
- **Liveblocks storage** holds *positional and in-session collaborative* state (x/y, z-order, group membership, live cursors, presence, comment threads while editing).
- On meaningful change (debounced), positions/structure are persisted back to `board_item_positions` / `board_collections` so the board survives a Liveblocks room eviction and is queryable. Treat Postgres as the system of record; Liveblocks as the fast collaborative cache.

**Backend:** Next.js server actions + route handlers · Supabase Postgres + Storage · Supabase Realtime for non-canvas live updates (e.g. Home, lists) where Liveblocks isn't already in play.

**Auth & orgs — Decision:** **Clerk** for auth and **organizations = workspaces**. Each wedding workspace is a Clerk organization; Clerk org membership + a `member_roles` table drives RBAC. This gives invitations, roles, and multi-workspace (planner mode) for free structurally.

**File handling:** Supabase Storage, private buckets, signed upload + signed read URLs. Next.js image pipeline for optimization.

**Link previews:** server-side fetch + Open Graph extraction; store canonical URL + raw metadata; manual title/image override; screenshot upload fallback for platforms with limited previews (Instagram/TikTok). Respect platform terms — no scraping of private/protected content.

**Integrations (MVP):** Pinterest embeds/save · Google Maps Places (venues/destinations) · Resend (email) · Twilio (optional SMS reminders). Reserved/stubbed: Stripe (payments), Google Calendar.

**AI (MVP, named "Peacekeeper"):** Anthropic Claude API for categorization, link/vendor/budget/decision summaries, timeline generation, guest cleanup, contract summary (with disclaimer). Enforce the AI boundaries from spec §19/§37 in a single system-prompt module: no vows by default, no final decisions, no legal/financial advice, doesn't claim to be a planner unless planner mode is on, never contacts vendors.

**Hosting:** Vercel (app) · Supabase cloud · Liveblocks cloud · Clerk cloud.

---

## 4. Data model for the core loop

Full table list is in spec §20. Below is the **subset the loop needs first**, with the columns that matter and the relationships that must not be compromised. Build these in Phase 1–4; stub the rest as empty migrations so foreign keys resolve.

### 4.1 Identity & workspace

```
users            (id, clerk_user_id, name, display_name, avatar_url, email, phone?, created_at)
workspaces       (id, clerk_org_id, name /*wedding name*/, created_by, created_at)
wedding_profiles (id, workspace_id UNIQUE, partner_one_label, partner_two_label,
                  date_status ENUM(known,range,none), wedding_date?, date_range_start?, date_range_end?,
                  planning_stage ENUM(...8 stages...), guest_estimate?, guest_max?,
                  budget_total?, budget_confidence ENUM(firm,flexible,unknown), created_at)
workspace_members(id, workspace_id, user_id, role ENUM(owner,partner,planner,collaborator,contributor,viewer,admin),
                  partner_label?, invited_by, status ENUM(invited,active,removed), created_at)
member_roles     (role, capability)  -- capability grants, see §4.4
```
Note: editable partner labels live on `wedding_profiles` (defaults "Partner One"/"Partner Two") and optionally per-member. **Never hard-code bride/groom anywhere.**

### 4.2 The board

```
boards               (id, workspace_id, type ENUM(master_vision,venue,ceremony,reception,attire,
                       food_beverage,florals_decor,photo_video,guest_experience,music_entertainment,
                       stationery_signage,honeymoon?,prewedding?,custom), title, is_optional, sort, created_at)
board_collections    (id, board_id, name /*Dream,Maybe,Shortlist,Approved,Booked,Not now,Questions*/, sort)
board_items          (id, workspace_id, board_id, collection_id?, type ENUM(image,pdf,link,pinterest_pin,
                       pinterest_board,tiktok,instagram,vendor_site,youtube,screenshot,note,color_swatch,
                       file,checklist,decision_card,vendor_card,budget_card,guest_experience_card),
                       title, body?, color_hex?, source_url?, link_preview_id?, upload_id?,
                       disposition ENUM(captured,organized,discussing,approved,rejected,poofed,archived),
                       is_favorite, approved_by?, approved_at?, created_by, created_at, updated_at)
board_item_positions (board_item_id, board_id, x, y, w, h, z, rotation, group_id?, pinned, updated_at)
link_previews        (id, canonical_url, title, description, image_url, favicon_url, author?,
                       source_domain, raw_meta JSONB, fetched_at)
uploads              (id, workspace_id, bucket, path, mime, size, width?, height?, uploaded_by, created_at)
board_comments       (id, board_item_id, author_id, body, mentions UUID[], parent_id?, created_at, edited_at?)
board_votes          (id, board_item_id, user_id, value SMALLINT, created_at)  -- 1 / -1
board_tags           (id, workspace_id, label, color_hex)
board_item_tags      (board_item_id, board_tag_id)
```

**The link that matters most** — a generic conversion edge so a board item can point at whatever it became:
```
board_item_links (id, board_item_id, target_type ENUM(vendor,task,budget_item,decision,event,document,honeymoon_item),
                  target_id UUID, created_by, created_at)
```
This is the spine of Poof (§5) and of the "every idea is actionable" principle. One item can have many links (a venue photo can poof into both a vendor and a budget item).

### 4.3 Plan objects (the targets of Poof + the Track surfaces)

Minimum viable columns; full field lists in spec §10–16.

```
decisions        (id, workspace_id, title, description?, category ENUM(...11 types...),
                  status ENUM(open,discussing,needs_vote,needs_planner_input,approved,deferred,rejected,changed),
                  due_date?, final_choice?, rationale?, created_by, approved_by?, approved_at?, created_at)
decision_options (id, decision_id, label, detail?, linked_board_item_id?, sort)
decision_votes   (id, decision_id, option_id, user_id, created_at)
decision_approvals(id, decision_id, required_user_id, status ENUM(pending,approved,rejected), acted_at?)

tasks            (id, workspace_id, title, description?, category ENUM(...13 types...),
                  owner_id?, status ENUM(not_started,in_progress,waiting,needs_decision,done,skipped),
                  due_date?, reminder_date?, priority ENUM(low,med,high),
                  linked_decision_id?, created_by, created_at)
milestones       (id, workspace_id, title, target_date, sort)

budgets          (id, workspace_id UNIQUE, total, confidence, created_at)
budget_categories(id, workspace_id, name, planned_amount?, sort)  -- seed from taxonomy
budget_items     (id, workspace_id, category_id, title, estimated_cost?, quoted_cost?, committed_cost?,
                  paid_amount?, deposit_due?, final_due?, vendor_id?, notes?, created_by, created_at)

vendors          (id, workspace_id, name, category ENUM(...full taxonomy...), website?, social_json?,
                  contact_name?, email?, phone?, location?, status ENUM(idea,shortlisted,inquired,responded,
                  quote_received,comparing,selected,booked,paid_deposit,fully_paid,declined,unavailable,archived),
                  quote_amount?, package_notes?, internal_notes?, created_by, created_at)
vendor_comparisons(id, workspace_id, title, vendor_ids UUID[3], fields JSONB, final_recommendation?)

events           (id, workspace_id, kind ENUM(planning_task,run_of_show,guest_itinerary),
                  title, date?, time?, location?, responsible_id?, notes?, visibility ENUM(private,shareable))
documents        (id, workspace_id, folder ENUM(...14 folders...), upload_id, title, created_by, created_at)
document_links   (id, document_id, target_type, target_id)
honeymoon_items  (id, workspace_id, kind, title, status, notes?, created_at)  -- optional module
```

### 4.3a Peace Notes (the emotional layer — see §6½)

This is a **separate, more protected** record than anything in the loop. It does not behave like a plan object; it behaves like a sealed letter.

```
peace_notes (id, workspace_id, author_id,
             type ENUM(letter, vow, gratitude, dedication, memory),
             title, body_encrypted /*see encryption note*/, body_preview?,
             visibility ENUM(private_to_author, shared_with_partner) DEFAULT private_to_author,
             -- "why we chose this" memories attach to a domain object; null for free-standing notes
             attach_to_type ENUM(board_item, decision, vendor, event, honeymoon_item, budget_item)?,
             attach_to_id UUID?,
             -- time/event lock
             lock_kind ENUM(none, date, event) DEFAULT none,
             lock_date DATE?,                         -- when lock_kind = date
             lock_event ENUM(wedding_day, anniversary)?,  -- when lock_kind = event
             lock_anniversary_index SMALLINT?,        -- optional: 1st, 5th… anniversary; null = every anniversary
             planner_access BOOLEAN DEFAULT false,    -- per-note explicit grant
             opened_at TIMESTAMPTZ?,                  -- first time the unlock condition was satisfied + opened
             created_by, created_at, updated_at)

peace_note_type_grants (id, workspace_id, grantee_id /*usually the planner*/,
             type ENUM(letter, vow, gratitude, dedication, memory),
             granted_by, created_at)  -- per-TYPE planner grant (coarser than per-note planner_access)
```

Notes on the schema:
- **Attach target** reuses the same `(type, id)` polymorphic pattern as `board_item_links`/`document_links`, so a memory ("why we chose this venue / song / dish / dress / tradition") hangs off the exact object the couple is reacting to. The attachable set deliberately includes `board_item`, `decision`, and `vendor` so memories ride the loop's objects, plus `event` (traditions/ceremony), `honeymoon_item`, and `budget_item`.
- **Encryption at rest:** `body_encrypted` is stored encrypted (envelope encryption with a per-workspace key in a managed KMS/secret, not in Postgres). For a `locked` note the body is *only* decrypted server-side once the unlock condition is verified — there is no API path that returns the plaintext of a still-locked note. `body_preview` (optional, author-set) may show a teaser line like "To be opened on our wedding day."
- **Resolving the lock:** a helper `peace_note_is_open(note, now, wedding_date)` returns true when `lock_kind = none`, or `date` and `now ≥ lock_date`, or `event = wedding_day` and `now ≥ wedding_date`, or `event = anniversary` and `now` is on/after the matching anniversary of `wedding_date` (respecting `lock_anniversary_index` if set). Event locks require a known `wedding_date`; if the wedding date is a range/unknown, an event-locked note stays locked and prompts the author to set a date.

### 4.4 Security model (build alongside the schema, not after)

- **Row Level Security on every table**, keyed by `workspace_id`. The policy predicate: the requesting user must have an active `workspace_members` row for that workspace. Helper: `auth_workspace_ids()` returning the caller's workspace set from the Clerk JWT/session.
- **Capability map** (`member_roles`) — enforce in policies *and* the service layer:
  - **Owner**: everything + billing, delete workspace, manage members.
  - **Partner**: full planning; cannot delete workspace.
  - **Planner**: full planning (tasks, vendors, documents, timeline, guests); no billing/delete.
  - **Collaborator**: add board items, comment, vote, complete *assigned* tasks.
  - **Contributor**: view *selected* budget categories (category-level visibility — see Decision in §10), comment, upload docs if allowed.
  - **Viewer**: read selected areas only.
  - **Admin**: platform support; **no access to wedding data without explicit, temporary, logged user consent.**
- Signed upload + signed read URLs; private buckets only.
- `audit_events` rows for: approvals, decision resolution, member/role changes, document access, workspace export/delete, support-consent grants, **and every Peace Note read, share, planner-grant, and unlock**.
- **No public guest pages and no vendor access in v1.**
- **Dream, Compass, and Peace Engine tables** are workspace-scoped under the same membership predicate. Engine outputs (recommendations, risks, roadmap) follow normal role visibility — the **planner sees them** (that's the point of planner-facing summaries) — **but the engine must never read a Peace Note body it hasn't been granted**: the engine's input gather respects the Peace Notes policy in full (locked/ungranted notes are excluded from its context). The Dream/Compass *itself* is shared planning data (owner/partner/planner), distinct from a private Peace Note.

**Peace Notes — stricter rules than the rest of the workspace** (the workspace-membership predicate is *necessary but not sufficient* here):
- A Peace Note row is selectable only if **all** hold: caller is in the workspace **AND** (caller is the `author_id`) **OR** (`visibility = shared_with_partner` AND caller's role is `partner`/`owner` partner-of-record) **OR** (caller is a planner **AND** (`planner_access = true` for this note **OR** a `peace_note_type_grants` row exists for this planner + this note's `type`)).
- **Planner is hidden by default.** No planner sees any Peace Note unless explicitly granted per-note or per-type. Removing a grant immediately revokes read access.
- **Locked-note rule overrides everything:** when `peace_note_is_open(...)` is false, the API returns metadata only (title, type, `body_preview`, lock info) — **never `body`** — for *all* viewers including the author. Decryption happens server-side only after the unlock check passes.
- **Admins have no access**, ever, to Peace Note bodies — the standard support-consent path does *not* grant Peace Note access; it is excluded by policy. (This is intentionally stronger than the rest of the workspace.)
- Enforce the above in **both** an RLS policy (using `auth_workspace_ids()` + author/role/grant checks) **and** the service layer (lock check + decryption gate), so a misconfigured client can never leak a sealed note.

### 4.5 Dream & Wedding Compass (the front of the loop)

The Dream Layer's durable output. The Compass is the single object every Compass Check and recommendation reasons against.

```
dreams          (id, workspace_id, created_by, created_at,
                 -- raw Dream responses captured during onboarding/Dream flow
                 responses_json /* meaning, emotional priorities, cultural/religious values,
                                  traditions, non-negotiables, things-to-avoid, priority rankings */)
wedding_compass (id, workspace_id UNIQUE, dream_id,
                 summary /* short human-readable "north star" */,
                 priorities_json /* ranked: food, intimacy, guest experience, decor… */,
                 non_negotiables_json, avoid_json,
                 cultural_values_json, traditions_json,
                 tone /* e.g. intimate · family-centered · elegant */,
                 version INT, updated_by, updated_at)
```
- The Compass is **versioned** — editing the Dream creates a new compass version with history, so a Compass Check can say "this drifted from what you said in March." The Peace Layer compares major choices against the *current* compass.

### 4.6 Peace Engine objects (the intelligence layer's records)

These persist what the engine did and proposed, so outputs are auditable, reproducible, and dismissable. (Field lists mirror the Product Update.)

```
planning_engine_runs     (id, workspace_id, trigger_type /* manual | onboarding | change_event | scheduled */,
                          trigger_source_type, trigger_source_id, status, started_at, completed_at,
                          created_by, summary)
planning_recommendations (id, workspace_id, engine_run_id, title, description,
                          recommendation_type /* next_action | poof_suggestion | decision_prompt |
                                                budget_guidance | vendor_gap | guest_impact | compass_check */,
                          priority, reason, linked_entity_type, linked_entity_id,
                          suggested_owner_id, suggested_due_date,
                          status /* new | accepted | dismissed | deferred | completed */, created_at, updated_at)
planning_risks           (id, workspace_id, engine_run_id, risk_type /* budget | guest_count | timeline |
                          vendor_booking | document | decision_bottleneck | dream_mismatch | planner_workload |
                          family_pressure | weather | destination_travel */,
                          severity, title, description, suggested_resolution,
                          linked_entity_type, linked_entity_id,
                          status /* open | acknowledged | resolved | dismissed */, created_at, updated_at)
planning_dependencies    (id, workspace_id, source_entity_type, source_entity_id,
                          depends_on_entity_type, depends_on_entity_id, dependency_reason,
                          status, created_at, updated_at)
                          -- e.g. "catering quote depends on guest count range"; "timeline depends on ceremony start time"
planning_snapshots       (id, workspace_id, snapshot_type, summary,
                          budget_snapshot_json, vendor_snapshot_json, guest_snapshot_json,
                          decision_snapshot_json, timeline_snapshot_json, dream_alignment_json, created_at)
recommendation_feedback  (id, workspace_id, recommendation_id, user_id,
                          feedback_type /* helpful | not_helpful | wrong | already_done | not_relevant | save_for_later */,
                          feedback_note, created_at)
```

These reuse the same `(linked_entity_type, linked_entity_id)` polymorphic pattern as `board_item_links`, so a recommendation or risk can point at any object in the loop (a board item, vendor, decision, budget item, guest, task, document).

---

## 5. The Poof conversion engine (the differentiator — spec deeply)

Poof is the moment inspiration becomes plan. It must feel instant, magical, and never lossy. Build it as one server action (`poofBoardItem`) with per-target adapters, plus the Framer Motion flourish on the client.

### 5.1 Interaction
- Entry points: drag an item into the **action zone** (a soft "set in peace" dock on the board edge) **or** tap **"Poof this"** on the item/drawer.
- A small radial/menu appears with the targets:
  1. Poof into **vendor**
  2. Poof into **task**
  3. Poof into **budget item**
  4. Poof into **decision**
  5. Poof into **timeline event**
  6. Poof into **document**
  7. Poof into **honeymoon activity** (only if honeymoon module enabled)
  8. Poof into **guest experience note**
- On confirm: play the poof animation (item shimmers, a small "✦ set in peace" badge settles onto the card), create the target, write `board_item_links`, set item `disposition = poofed`, toast with a deep link to the new object ("View vendor →"). The board item **remains**.

### 5.2 Field carry-over (so poof is smart, not just a redirect)

| Target | Pre-filled from board item | Default status | Side effects |
|---|---|---|---|
| **Vendor** | name←title; website←source_url; category←AI guess from board type/link; social←source; internal_notes←item body | `shortlisted` | auto-create a follow-up **task** "Inquire with {vendor}" (status `not_started`); link both to item |
| **Task** | title←title; category←board type→task category map; description←body | `not_started` | optional due_date prompt |
| **Budget item** | title←title; category←board type→budget category map; estimated_cost←parsed number if present | — | if vendor link exists, set `vendor_id` |
| **Decision** | title←"Decide: {title}"; first option seeded from this item | `open` | other board items in same collection offered as additional options |
| **Timeline event** | title←title; kind←`planning_task` (or run_of_show if from Reception/Ceremony board) | — | prompt for date/time |
| **Document** | from a pdf/file item: move `upload` into `documents` with folder guessed from board type | — | keep on board as a preview that links to the doc |
| **Honeymoon activity** | title←title; notes←body | `dreaming` | only if module on |
| **Guest experience note** | note text←title/body | — | creates event(kind=guest_itinerary, visibility=private) or a tagged note |

**Worked example (from spec):** user pastes a florist Instagram link → board makes a rich card → "Poof into vendor" → creates `vendors` row (name, source link, category=florist, status=shortlisted, notes), auto-creates task "Inquire with {florist}", writes two `board_item_links`, badges the card "set in peace," toasts "Vendor added · View →." Exactly the spec example, now mechanized.

### 5.3 Rules
- Poof is **additive and reversible**: "Un-poof" deletes the child object(s) created from that poof event (guarded by confirmation + audit row) and resets disposition. Never silently lose the board item.
- One item → many poofs allowed; show all children in the item drawer under "Became."
- Category guessing is AI-assisted but always user-editable in the confirm step; never block on the AI.
- Respect permissions: a Collaborator can poof into task/decision but not create a budget item (capability check in the adapter).

### 5.4 Poof's quiet sibling — "attach a memory"

Poof converts inspiration into *logistics*. Peace Notes capture the *meaning*. They meet at one affordance: on any board item, decision, or vendor, the item menu offers **"Attach a Peace Note ✎ (why we chose this)"** beside "Poof this." Choosing it opens the memory composer (`type = memory`) pre-attached to that object (`attach_to_type/attach_to_id` filled in). So the moment a couple *approves* the garden venue, they can also record *why it mattered* — and that memory rides alongside the vendor/decision forever, honoring its own visibility + lock rules. This is the bridge from the manuscript to the software: the loop tracks the *what*; the attached memory holds the *why*.

### 5.5 Engine-suggested poofs

The Peace Engine (§6) watches the board and **suggests** poofs as `planning_recommendations` of type `poof_suggestion` — e.g. *"This catering image looks like a family-style service idea. Poof it into a catering requirement?"* or *"This venue link looks serious. Poof it into a vendor record?"* or *"This tradition note should become a ceremony timeline item,"* or *"This memory could become a Peace Note."* The suggestion surfaces inline on the card and in the Peace Center; accepting it runs the normal `poofBoardItem` adapter with the suggested target pre-selected. The engine proposes; the couple always confirms.

---

## 6. The Peace Engine — the intelligence layer (incl. "Peacekeeper")

The Peace Engine is the new core feature: the intelligence layer that turns The Missing Peace from a passive workspace into an active planning system. It reads the Dream/Compass, planning stage, budget, destination, guest count, board items, vendors, documents, decisions, and timeline, and produces practical planning guidance. It **does not replace a planner** — it makes planning clearer. It constantly answers: *"What should we do next, and why?"* (**Peacekeeper** is the friendly name for the assistant-facing voice of this engine.)

### 6.1 When it runs
- **First use:** after Dream is complete, the engine generates the first wedding plan — roadmap, budget priorities, vendor priorities, board sections, decision queue, first tasks, guest prompts, document folders, honeymoon setup (if enabled), Peace Score, and Compass Checks.
- **Ongoing:** it re-reviews the plan on every important change — wedding date, guest count, budget, venue added, vendor booked/declined, document uploaded, board item approved/poofed, decision approved/changed, honeymoon added, planner invited, payment milestone added — then updates the plan and suggests next actions. Each review is a `planning_engine_run` (§4.6).

### 6.2 What it outputs (the nine)
1. **Next Best Actions** — 3–5 at a time (e.g. *"Set a guest count range before comparing venues."*).
2. **Planning Roadmap** — living plan from date/stage/destination/complexity: phases, milestones, deadlines, tasks, dependencies, owners, status, linked board items/vendors/documents/decisions.
3. **Decision Queue** — surfaces unresolved decisions (guest count range, venue type, city, food style, photography style, planner involvement, budget priority, child/plus-one policy, cultural/religious needs, honeymoon inclusion).
4. **Risk Radar** — flags budget / guest-count / timeline / vendor-booking / document / decision-bottleneck / dream-mismatch / planner-workload / family-pressure / weather / destination-travel risks.
5. **Compass Check** — compares major choices against the Wedding Compass (e.g. *"This venue is beautiful, but it supports 300 guests and may push away from your Dream of an intimate family dinner."*).
6. **Budget Guidance** — advisory insights (e.g. *"Your Dream prioritized food, but the budget weights decor over catering."*).
7. **Vendor Gap Detection** — missing vendors by wedding type (e.g. outdoor → rentals, lighting, weather backup, restrooms).
8. **Guest Impact** — how guest decisions ripple to cost, venue, food, seating, timeline.
9. **Poof Recommendations** — when inspiration should become action (§5.5).

### 6.3 How it works — deterministic rules + AI interpretation
- **Deterministic rules** for anything that must be reliable: budget math, guest-count calculations, date-based timeline generation, overdue tasks, missing vendor categories, permission logic, approval/booking status, payment due dates, document linkage. These run in code, not the model.
- **AI interpretation** (Anthropic Claude) for meaning and judgment: summarizing the Dream, explaining tradeoffs, detecting Dream mismatch, generating recommendation language, interpreting board-item meaning, summarizing vendor comparisons, suggesting discussion questions, turning inspiration into actions.
- Inputs the engine reads: Dream responses, Wedding Compass, board items (incl. approved/rejected), budget + categories, guest count + households, vendor records + statuses, timeline tasks, planning stage, wedding date, destination, documents, decisions, honeymoon module, user role, planner notes, activity history — **and Peace Notes only where granted** (§4.4).

### 6.4 Boundaries (one shared, unit-tested prompt module)
Be calm, practical, emotionally intelligent, and specific; keep the Wedding Compass at the center of reasoning. **Do not:** make final decisions for the couple, write vows or letters by default, give legal or financial advice, claim to be a wedding planner unless planner mode is on, contact vendors, push, give generic wedding advice, or overcomplicate v1.

**System-prompt seed (Claude-owned, refine in Phase 6):**
> *"You are the planning intelligence layer for The Missing Peace, a Wedding Planning Engine. Your job is to help couples and planners turn wedding dreams, inspiration, budget, guest details, vendors, documents, and decisions into a clear plan. Be calm, practical, emotionally intelligent, and specific. Do not make decisions for the couple. Explain tradeoffs clearly. Keep the Wedding Compass at the center of your reasoning."*
Output contract: planning summary · top 3–5 next actions · open decisions · planning risks · Dream-alignment notes · budget guidance · vendor gaps · guest impact · poof suggestions · suggested discussion prompts.

### 6.5 Version-one scope for the engine
**Include:** Wedding Compass generation, planning roadmap generation, Next Best Actions, Decision Queue, Risk Radar, budget guidance, vendor gap detection, guest-count impact notes, poof suggestions, Compass Checks, manual feedback on recommendations (`recommendation_feedback`).
**Exclude from v1:** automated vendor outreach, payment processing, public guest website, full legal contract review, native mobile app, advanced travel booking, vendor marketplace.

---

## 6½. Peace Notes — the emotional layer (the soul of the product) ✦

**Why this exists.** Without Peace Notes, The Missing Peace is a genuinely useful, beautiful planning tool. *With* Peace Notes, it has a soul. Every other module answers "what are we doing for the wedding?" Peace Notes answers "what does this wedding *mean*?" It is the bridge between the manuscript metaphor (love manuscript, chapters, vows, fragments) and the working software — the place where the planning becomes personal and worth keeping long after the day is over.

**What it is.** A private, protected emotional layer where the couple can write, save, lock, and protect the meaning behind the wedding. It is deliberately *not* part of the action loop — a Peace Note never becomes a task or a budget line — but it can attach to the loop's objects so meaning lives beside logistics.

### 6½.1 Note types
- **Private letters** to each other — written now, often locked to be read later.
- **Draft vows** — a private drafting space (Peacekeeper does **not** write vows by default; this is the couple's voice).
- **Gratitude notes** — to family, friends, mentors, each other.
- **Family dedications** — honoring people present or absent.
- **"Why we chose this" memories** — short reflections that **attach to an entity**: a venue, a song, a flower, a dish, an attire choice, a tradition. Mechanically these attach to the domain objects already in the model (board item, decision, vendor, event, honeymoon item, budget item) via `attach_to_type/attach_to_id` (§4.3a, §5.4).

### 6½.2 Visibility model (three states)
- **Private to author** *(default)* — visible only to the person who wrote it. Partner cannot see it; planner cannot see it.
- **Shared with partner** — opt-in; both partners can read it. Still hidden from the planner.
- **Planner access** — **hidden by default.** A planner sees a Peace Note only when explicitly granted, either **per note** (`planner_access = true`) or **per type** (a `peace_note_type_grants` row — e.g. "let my planner see *gratitude* notes for thank-you coordination, but never my letters or vows"). Grants are revocable and every grant/read is audited (§4.4).

### 6½.3 Locking (time capsules)
A note can be sealed so it can only be opened later. Two lock kinds, both supported:
- **Date lock** — opens on an explicit calendar date.
- **Event lock** — opens on the **wedding day** or on an **anniversary** (optionally a specific one — 1st, 5th, 10th — or every anniversary).

While locked, the body is encrypted at rest and **never** returned by the API — not to the partner, not to the author, not to admins — until `peace_note_is_open(...)` passes (§4.3a). Locked notes show only a teaser ("To be opened on our wedding day"). When the unlock condition arrives, the note becomes *unlockable* and surfaces a calm "ready to open" moment (a small ceremony, not a notification spammed weeks early). Event locks need a known wedding date; if the date is a range/unknown, the note stays sealed and gently prompts the author to set one.

### 6½.4 Where it lives & connects
- **Its own calm space** in navigation (under "More" on mobile; a quiet entry in the left nav on desktop) — never mixed into task lists or dashboards.
- **Attached memories** appear inside the relevant object's detail drawer (a vendor card, a decision, a board item) as a soft "✎ Why we chose this" affordance — respecting that note's own visibility/lock (a partner viewing a vendor won't see the other partner's private memory on it).
- **Home** may show, at most, a single gentle line when a locked note becomes openable ("A letter is ready to open") — and nothing about locked content otherwise. Peace Notes never generate nagging.
- **Peacekeeper boundaries still apply:** AI may help organize or prompt reflection, but does **not** write vows or letters by default and never reads a note it hasn't been explicitly allowed to.

### 6½.5 Acceptance for the layer (the soul test)
A note can be written, typed, kept private, optionally shared with a partner, optionally attached to a venue/song/etc., optionally locked to the wedding day or an anniversary, and is provably invisible to the planner until granted and invisible to everyone (including the author) until unlocked. If all of that is true and it *feels* like a sealed letter rather than a form field, the layer is done.

---

## 7. Build phases & task breakdown

Phases follow the spec (§33) but are ordered so the **core loop is demonstrable by end of Phase 4**; the rest hardens it. Each task is sized to be independently shippable.

### Phase 0 — Project setup (pre-req)
- Next.js App Router + TypeScript + Tailwind; design-system package with brand tokens (§9).
- Supabase project; migration tooling; Clerk app with Organizations enabled; Liveblocks project.
- Env var scaffolding (§11); CI (lint, typecheck, test); Vercel preview deploys; error/log baseline.

### Phase 1 — Foundation
- Clerk auth (sign up / sign in); organization = workspace creation.
- DB migrations for §4.1–4.6 core tables (identity, board, plan objects, Peace Notes, **Dream/Compass, and Peace Engine objects**) **+ empty migrations** for all remaining spec §20 tables so FKs resolve later.
- RLS policies + capability map; `auth_workspace_ids()`; audit_events writer.
- **Peace Notes groundwork:** `peace_notes` + `peace_note_type_grants` migrations; envelope-encryption helper (per-workspace KMS key) for `body_encrypted`; the stricter RLS policy (author / shared-with-partner / planner-grant) and the `peace_note_is_open()` lock helper. Build the security here even though the UI lands in Phase 3 — the layer's whole value is that it was protected from line one.
- App shell: calm left nav (desktop) / bottom nav (mobile: Home, Board, Timeline, Guests, More); routing; empty states.
- **Dream Layer + Wedding Compass:** the Dream flow (meaning, emotional priorities, cultural/religious values, traditions, non-negotiables, things to avoid, priority ranking) → generate the first **Wedding Compass** (`dreams` + `wedding_compass`, versioned). This is the front of the loop and the input every later Compass Check reasons against.
- **Onboarding questionnaire** (spec §7, Steps 1–7) → "Generate Workspace" server action that seeds: default boards, board collections (Dream/Maybe/Shortlist/Approved/Booked/Not now/Questions), budget categories, vendor tracker, guest template, decision log, document folders, planning milestones, and "next 3 actions." After Dream + onboarding complete, fire the **first `planning_engine_run`** to generate the starting plan (roadmap, decision queue, first tasks, Peace Score, Compass Checks). *(Claude-owned JSON + Compass/engine prompt templates feed this — see §11.)*

### Phase 2 — The Board (collect + organize)
- tldraw + Liveblocks canvas; presence, live cursors, "currently viewing," real-time movement, conflict handling, item lock on text edit, undo/redo, activity history.
- Board item rendering for all item types (image, pdf, link, pinterest pin/board, tiktok, instagram, youtube, screenshot, note, color swatch, file, and the card types).
- **Add item flow**: paste link → server-side OG fetch → rich card; image/PDF/screenshot upload (signed URLs); text note; color swatch.
- Drag/resize/group/stack/pin/duplicate/delete/move-across-boards; sections; rename sections.
- Persist positions/structure back to Postgres (debounced).
- Board filters (owner, category, status, tag, budget impact, vendor category, approved only, needs decision, recently added, source type).

### Phase 3 — Planning core (the Track surfaces)
- **Budget** CRUD (advisory): total, confidence, categories from taxonomy, items with estimated/quoted/committed/paid, due dates, vendor/contract/board links. Budget intelligence read-outs (projected overage, per-guest, missing categories, high-cost, suggested tradeoffs) as computed views.
- **Vendors** CRUD: full category taxonomy, status pipeline, fields, comparison (3 side-by-side), board/budget/timeline/doc links.
- **Guests** CRUD: households + guests, invite-per-event, RSVP states, guest views (needs address, RSVP pending, meal counts, traveling, VIPs, wedding party…). Private; no portal.
- **Timeline**: Planning Timeline (generated), Run of Show, Guest Itinerary (private, structured for future website).
- **Documents**: folders, uploads (pdf/image/doc/sheet/csv/note), link to vendor/payment/date/task.
- **Decisions** module: types, fields, status machine, options, votes, required approvers, lock-on-approve with history.
- **Engine inputs ready:** ensure every planning-core module exposes the clean reads the Peace Engine needs (budget totals/categories, vendor statuses, guest counts/households, decision states, timeline tasks, document links) plus the deterministic computations (overdue tasks, missing vendor categories, budget math, per-guest cost) as queryable views. The deterministic half of the engine can start emitting `planning_risks`/`planning_recommendations` here even before the AI layer (Phase 6) lands.
- **Peace Notes module** (its own calm space): compose/edit/save the five note types; visibility toggle (private-to-author ↔ shared-with-partner); time/event lock UI (date picker + wedding-day / anniversary options); locked-note teaser state; server-side decryption gate; per-note and per-type planner grants. Wire reads through the Phase-1 RLS + lock helper. This is where the layer becomes usable.

### Phase 4 — Conversion layer (POOF) ⭐
- `poofBoardItem` server action + 8 target adapters (§5.2), capability-gated.
- Action zone dock + "Poof this" menu; confirm step with editable AI category guess.
- `board_item_links` writes; "Became" section in item drawer; un-poof with confirm + audit.
- Poof animation (Framer Motion) + "set in peace" badge + deep-link toast.
- **"Attach a memory" affordance** (§5.4) on board items, decisions, and vendors → opens the Peace Notes memory composer pre-attached to that object; attached memories render in the object's detail drawer respecting their own visibility/lock.
- **At end of Phase 4 the full loop is demonstrable end-to-end.** This is the internal milestone to celebrate/demo.

### Phase 5 — Collaboration & Home
- Comments, @mentions, reactions, approval requests, decision voting wired to notifications.
- **Notifications**: in-app + email (Resend) at launch; optional SMS (Twilio); push later. Copy from the content kit.
- **Peace Center** (renamed from Home) = the calm command center that surfaces the engine's outputs: Peace Score, **Wedding Compass summary**, Next Best Actions (3–5), **Planning Roadmap**, Decision Queue, **Risk Radar**, Budget Snapshot, **Vendor Gaps**, **Guest Count Impact**, Upcoming Dates, Recent Activity. Keep it calm — no chaotic dashboards, no early nagging; show what matters *now*.
- Mobile loop parity pass (add link, upload, comment, vote, approve, complete task, update vendor status, add guest, invite) + bottom-sheet item details, floating add, long-press actions.
- **Peace Notes collaboration touches:** planner per-type/per-note grant flow + revoke; the single gentle "a letter is ready to open" surfacing when a locked note becomes unlockable (no early nagging); Peace Notes reachable on mobile under "More."

### Phase 6 — The Peace Engine (intelligence layer)
- Engine orchestration: `planning_engine_runs` triggered on the change events in §6.1 (and manual/scheduled); writes `planning_recommendations`, `planning_risks`, `planning_dependencies`, `planning_snapshots`.
- **Deterministic rule pack** (budget math, overdue tasks, missing vendor categories, date-based roadmap, dependencies, booking/payment status) — reliable, testable, no model.
- **AI interpretation layer** (Peacekeeper): Compass summary, tradeoff explanations, Dream-mismatch/Compass Check, recommendation language, board-item meaning, vendor-comparison summaries, discussion prompts, poof suggestions — behind the shared boundary prompt (§6.4), all optional and never blocking.
- The nine outputs (§6.2) wired to the Peace Center; `recommendation_feedback` (helpful / not helpful / wrong / already done / not relevant / save for later) captured to improve relevance.
- Guardrail tests for §6.4 boundaries (no vows/legal/financial advice, no final decisions, no vendor contact, planner-mode gating) and for invariants #6–#7 (engine never acts autonomously; outputs trace to a run).

### Phase 7 — Polish
- Branding pass (manuscript metaphors: chapters, vows, fragments, "set in peace," peace notes), animations, all empty/error states, **WCAG 2.2 AA** pass (keyboard board controls, DnD alternatives, screen-reader labels, contrast, reduced-motion, focus states, no color-only meaning), security review (RLS audit, signed URLs, support-consent flow, export + delete-workspace flows), and test hardening.
- **Peace Notes ceremony + security review:** the "ready to open" unlock moment as a small, beautiful ritual (not a toast); encryption-at-rest audit and a dedicated penetration check that *no* API path (partner, planner-with-grant, admin, export) ever returns a still-locked body or an ungranted note; confirm export/delete-workspace handle sealed notes correctly (locked notes excluded from export until openable, or exported encrypted with a clear notice).

---

## 8. MVP acceptance criteria → build mapping

Every criterion from spec §30, mapped to where it's satisfied. Treat this as the launch checklist.

| Acceptance criterion | Satisfied by |
|---|---|
| Couple can create a wedding workspace | Phase 1 (Clerk org + onboarding) |
| Edit partner labels | Phase 1 (`wedding_profiles` labels, no bride/groom anywhere) |
| Invite a planner | Phase 1 (Clerk invite + `workspace_members` role=planner) |
| Paste Pinterest/vendor link onto board | Phase 2 (Add item → OG fetch) |
| Board creates a preview card | Phase 2 (`link_previews` + card render) |
| Drag and organize the card | Phase 2 (tldraw + positions) |
| Comment on the card | Phase 2/5 (`board_comments`) |
| Vote on the card | Phase 2/5 (`board_votes`) |
| Approve the card | Phase 2 (disposition=approved + audit) |
| Convert card → vendor/task/budget/decision | **Phase 4 (Poof)** |
| Track ≥10 vendor categories | Phase 3 (vendor taxonomy) |
| Create budget with categories + estimated costs | Phase 3 (budget) |
| Add guests and households | Phase 3 (guests) |
| Create timeline tasks | Phase 3 (timeline/tasks) |
| Upload a contract PDF | Phase 3 (documents) |
| Use product on mobile and desktop | Phase 5 (mobile parity) |
| Permissions prevent unauthorized access | Phase 1 (RLS + capabilities) |
| Workspace data isolated | Phase 1 (RLS by workspace) |
| Write a Peace Note (letter/vow/gratitude/dedication/memory) | Phase 3 (Peace Notes module) |
| Keep a note private, or opt-in share with partner | Phase 1 RLS + Phase 3 (visibility toggle) |
| Attach a "why we chose this" memory to a venue/song/etc. | Phase 4 (attach-a-memory) + §4.3a |
| Lock a note to the wedding day or an anniversary (or a date) | Phase 1 lock helper + Phase 3 (lock UI) |
| Planner cannot see Peace Notes unless granted (per note/type) | Phase 1 RLS + Phase 5 (grant flow) |
| Locked note body is unreadable by anyone until it unlocks | Phase 1 (encryption + decryption gate); Phase 7 (pen test) |
| Complete Dream and generate a Wedding Compass | Phase 1 (Dream + Compass) |
| Engine generates a starting plan from onboarding + Dream | Phase 1 (first run) + Phase 6 (engine) |
| Peace Center displays Next Best Actions | Phase 5 (Peace Center) + Phase 6 |
| Engine detects missing vendor categories | Phase 6 (deterministic rules) |
| Engine identifies unresolved decisions | Phase 6 (Decision Queue) |
| Engine flags basic budget risk | Phase 3/6 (Risk Radar) |
| Engine explains guest-count impact | Phase 6 (Guest Impact) |
| Engine suggests Poof actions from board items | Phase 6 (§5.5) |
| Engine compares a major choice against the Compass | Phase 6 (Compass Check) |
| User can accept / dismiss / defer / complete recommendations | Phase 6 (recommendation lifecycle) |
| System stores engine runs + recommendation history | Phase 1 schema + Phase 6 |
| Positioning says "Wedding Planning Engine"; board is the *surface* | §1 / Phase 7 (copy) |
| Feels calm, beautiful, on-brand — *and has soul* | Phase 7 (polish + Peace Notes ceremony) |

---

## 9. Brand & design tokens to lock (so polish isn't a rewrite)

Define these in Phase 0 so every screen is on-brand from the start.

- **Category & positioning:** The Missing Peace is a **Wedding Planning Engine** — never market it as "a board." The board gives **beauty**, the Dream gives **meaning**, the Peace Engine gives **movement**; that combination is the product, and it competes as *the system that makes the wedding make sense*, not as another Pinterest/Miro/Notion. Avoid leading with marketplace or board language.
- **Feeling:** finding calm in chaos. A private creative studio for a marriage, not a spreadsheet with flowers. Soft, clear, reassuring. No aggressive alerts, no chaotic dashboards. The engine's voice (Peacekeeper) is calm and practical — it guides, it never nags or pushes.
- **Palette (warm neutrals):** pearl, cream, muted gold, soft sage, clay, blush, charcoal. Build as semantic tokens (`--surface`, `--surface-raised`, `--accent-gold`, `--accent-sage`, `--ink`, etc.), never raw hex in components. Ensure AA contrast for every text/background pairing (don't rely on color alone).
- **Type & motion:** editorial, generous spacing; Framer Motion only for meaningful moments (poof, approval "vow," section transitions); honor `prefers-reduced-motion`.
- **Manuscript metaphors (use consistently in copy/UI):** workspace = *love manuscript*; planning stages = *chapters*; important decisions = *vows to the plan*; saved inspiration = *fragments*; approved items = *"set in peace"*; private notes = *peace notes*. Recommended assistant name: **Peacekeeper**. (Private vows/letters section — see Decision in §10 — is part of the soul; keep it separate from logistics.)
- **Soul vs. utility (the emotional thesis):** every other module makes the product *useful*; **Peace Notes (§6½) make it have soul.** Write the Peace Notes surface in a register the rest of the app doesn't use — quieter, slower, more intimate; closer to a letter than a UI. The rest of the product helps couples *plan a wedding*; this layer helps them *remember why*. Copy here should never sound like task software: "A private letter, sealed until your wedding day" — not "Create note (locked)." The contrast is intentional and is what people will tell their friends about.
- **Mobile:** stacked sections on phone, spatial canvas on tablet; pinch-zoom where possible; floating add; long-press for actions; bottom sheets for detail. The loop is **never read-only** on mobile.

---

## 10. Open product questions — resolved

Adopting the spec's own recommendations (§34) as **Decisions**, so they don't block the build:

1. **Multi-workspace now?** Yes — build multi-workspace architecture from day one (Clerk orgs), even though Sid's own wedding is the first workspace. Planner mode is then a thin layer, not a refactor.
2. **Contributor budget visibility?** Category-level — contributors see only the budget categories they're granted. Enforced in RLS + capability map (§4.4).
3. **Cultural/religious ceremonies first-class?** Yes — they're a quiet, meaningful differentiator. Already represented in board types, decision types, task categories, and onboarding optional modules.
4. **Private vows / letters section?** Yes — **now fully specified as the Peace Notes layer (§6½)**: five note types, three-state visibility (private / shared-with-partner / planner-granted), wedding-day and anniversary time locks, encryption-at-rest, and "why we chose this" memories that attach to loop objects. It is the bridge from the manuscript to the software and the product's source of soul.
5. **Conflict-reducing features for family decisions?** Later. v1 ships decision *ownership, voting, and final-approver* rules (the foundation); richer conflict mediation is post-v1.
6. **Planner templates?** Yes structurally (tables + planner mode shell in v1), ship simple templates first.

**Explicitly NOT in v1** (guardrails against bloat): public wedding website, vendor marketplace, vendor portal, direct payments/Stripe live, registry commerce, automated vendor outreach, full offline editing, native iOS/Android, complex seating-chart engine, legal advice.

---

## 11. Environment & seed data

**Env vars (scaffold in Phase 0):** Clerk (publishable + secret + org settings), Supabase (URL, anon, service role), Liveblocks (public + secret), Resend, Twilio (optional), Google Maps Places, Anthropic API key, app URL/base.

**Seed data (Claude-owned JSON, consumed by "Generate Workspace"):** default boards, default board collections, default budget categories + taxonomy, default vendor categories (full taxonomy), default document folders, default decision types, default task templates per planning stage, default milestones, default honeymoon sections, onboarding paths per "who is planning" answer, the Next-Best-Actions rules, **gentle Peace Notes starter prompts per type** (e.g. a "why we chose this" prompt, a wedding-day letter prompt, a gratitude prompt) — optional, never auto-filled — **plus the Peace Engine content kit**: Dream questionnaire + Wedding-Compass generation logic, the engine system/prompt templates and output contract (§6.4), wedding-roadmap templates by stage/destination, risk categories + severity rubric, recommendation language, Dream-to-plan translation logic, Compass-Check / budget-insight / vendor-gap / guest-impact wording, and planner- vs couple-facing summary styles. These are the Claude-owned deliverables (spec §31 + Product Update "Claude Responsibilities") — generating them is the natural **next work item** after this plan (they slot directly into Phases 1 and 6).

---

## 12. Recommended next steps

1. **Approve this plan / adjust scope.** (You chose core-loop-deep; this plan reflects that.)
2. **Generate the Claude-owned content kit** (§11): the §31 JSON + brand voice + onboarding/empty/error/notification copy **and the Peace Engine content kit** (Dream questionnaire, Compass logic, engine prompt templates + output contract, roadmap templates, risk categories, recommendation language, Compass-Check wording). Pure content, no infrastructure, unblocks Phases 1 and 6 — a strong thing for me to produce next.
3. **Hand Phases 0–4 to engineering / Codex** with this doc + the content kit; demo the full loop at the end of Phase 4, then layer the Peace Engine (Phase 6) over it.
4. Decide build cadence and who owns each phase.

> The north star, restated (v2): **define the Dream → collect → poof → decide → track → check against the Dream → protect the peace.** The board gives beauty, the Dream gives meaning, the Peace Engine gives movement. Build that loop until it feels magical — and makes the wedding make sense — before adding anything else.
