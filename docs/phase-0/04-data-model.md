# 04 — Data Model Proposal

**Purpose:** describe the canonical wedding-workspace model — what exists (60 tables across 13 migrations), the **per-module data contract** the directive requires (what each module reads, writes, owns, influences, outputs, ripples, and Weaver-explains), and the **additions** needed to fully satisfy the directive. The design principle holds: relational structures for critical entities, structured JSON only where appropriate; **no opaque application-wide JSON blob** (directive "Data & Engine Architecture").

---

## 1. Existing tables (system of record — Supabase Postgres)

Grouped by concern. All are workspace-scoped and RLS-enabled unless noted.

**Identity & workspace:** `users` (Clerk-linked), `workspaces` (Clerk org-linked), `workspace_members` (role + editable `partner_label` + status), `wedding_profiles` (editable partner labels, date/stage/guest/budget).

**Dream & Compass:** `dreams` (`responses_json`), `wedding_compass` (summary, priorities/non-negotiables/avoid/cultural/traditions JSON, tone, **version**).

**Board (Design Studio):** `boards`, `board_collections`, `board_items`, `board_item_positions`, `board_comments`, `board_votes`, `board_tags`, `board_item_tags`, `board_item_links` (the conversion edge), `link_previews`, `uploads`.

**Plan objects:** `vendors`, `vendor_comparisons`, `budgets`, `budget_categories`, `budget_items`, `decisions`, `decision_options`, `decision_votes`, `decision_approvals`, `tasks`, `milestones`, `events`, `documents`, `document_links`, `honeymoon_items`, `honeymoon_profiles`, `honeymoon_item_hearts`.

**Guests & guest surfaces:** `households`, `guests`, `guest_pages`, `guest_photos`.

**Seating:** `seating_charts`, `seating_tables`, `seat_assignments`.

**Music:** `playlist_tracks`, `playlist_track_hearts`.

**Money Map:** `cost_benchmarks`, `cost_estimate_runs`, `payment_milestones`, `budget_contributors`, `budget_contributions`, `budget_scenarios`, `budget_scenario_items`, `budget_alerts`, `financial_activity_logs`.

**Peace Notes:** `peace_notes` (encrypted body + lock resolver), `peace_note_type_grants`.

**Peace Engine (Weaver substrate):** `planning_engine_runs`, `planning_recommendations`, `planning_risks`, `planning_dependencies`, `planning_snapshots`, `recommendation_feedback`.

**Audit:** `audit_events`.

**Assessment:** this already covers nearly every entity the directive's data-architecture list names — workspaces, members, roles, profile, dream inputs, compass versions, decisions (+status/ownership/history via approvals/votes/audit), recommendations (Next Best Actions), risks, module records, guests + requirements, budget/commitment data, timeline, vendors, seating, documents, media/uploads, public output (guest_pages), activity history. **The model is strong.** The gaps are specific and listed in §3.

## 2. Per-module data contract

For each module: **Reads** (from Compass/state) · **Writes** · **Owns** (decisions) · **Ripples** (events it can emit) · **Outputs** · **Weaver** (insights it can generate). This is the contract the directive requires every module to declare.

- **Dream Walk** — Reads: prior answers, board mood. Writes: `dreams`, `wedding_compass`. Owns: the Compass version. Ripples: seeds every module's priorities; a changed non-negotiable ripples to budget/guests/atmosphere. Outputs: the Compass. Weaver: summarize Dream → tone/summary; suggest priorities.
- **Peace Center** — Reads: Compass + full snapshot. Writes: engine runs (via action). Owns: nothing (aggregator). Ripples: none (it *shows* ripples). Outputs: Next Best Actions, Peace Score. Weaver: the whole interpretation surface.
- **Design Studio / Board** — Reads: Compass (mood). Writes: board_items/positions/tags, `board_item_links`. Owns: dispositions, Master Vision membership. Ripples: Poof → creates decision/vendor/budget_item/task/event/document/honeymoon_item; approval → Master Vision + mood → Compass. Outputs: Master Vision, mood line. Weaver: mood extraction, magic-arrange suggestions.
- **Feast Studio (NEW)** — Reads: Compass, guests, dietary/meal from `guests`, households, cultural values. Writes: `menus`, `menu_courses`, `dishes`, `dietary_requirements` (see §3). Owns: menu & meal-sequence decisions. Ripples: guest count/dietary → caterer brief + Money Map food category + guest-care warnings. Outputs: **caterer brief**, guest plate preview. Weaver: dietary coverage check ("Comparing the menu against 6 dietary needs"), cost guidance, guest-care warnings.
- **Atmosphere Lab (NEW)** — Reads: Compass tone, season, Master Vision palette. Writes: `atmosphere_profiles`, `palette_swatches`, lighting/floral/tablescape records (§3). Owns: palette/lighting/floral decisions. Ripples: palette → invitations, website appearance, cake, attire; ripple previews. Outputs: styling references for website/printables. Weaver: ripple previews, coherence checks.
- **Atelier (NEW)** — Reads: Compass, atmosphere palette, wedding party from guests. Writes: `attire_looks`, `look_pieces`, `attire_rules` (§3). Owns: look decisions, dress code. Ripples: dress code → guest website output; palette harmony with atmosphere. Outputs: **guest dress-code** text for the website. Weaver: couple/party harmony view, rule checks.
- **Guests** — Reads: Compass (guest-experience priorities). Writes: `households`, `guests`. Owns: invite/RSVP data. Ripples: guest count → Money Map pressure, seating capacity, catering count; dietary → Feast; song → Playlist. Outputs: guest list, CSV. Weaver: guest-care and count-impact insights.
- **Seating Studio** — Reads: guests (households, RSVP, dietary, VIP). Writes: charts/tables/assignments. Owns: seating decisions. Ripples: unseated accepted guests → task/warning. Outputs: printables (escort/place cards, sign). Weaver: seating suggestions from households/dietary.
- **Timeline** — Reads: decisions, vendors, milestones, wedding date. Writes: `tasks`, `milestones`, `events`, `planning_dependencies`. Owns: schedule. Ripples: overdue/critical-path → risk + Next Best Action. Outputs: run-of-show. Weaver: timeline-risk insights.
- **Money Map** — Reads: profile (budget/guests/location/type), vendors, decisions, contributions. Writes: budget items/categories, milestones, contributions, scenarios, alerts, `financial_activity_logs`. Owns: budget & commitment truth. Ripples: overage/at-risk fit → risk + tradeoff recommendations; guest count → per-guest pressure. Outputs: fit reading, likely ranges, "what can this budget hold." Weaver: budget guidance, Compass-protecting tradeoffs.
- **Vendors** — Reads: Compass, budget. Writes: `vendors`, `vendor_comparisons`. Owns: vendor selection/booking status, contract fields. Ripples: missing core vendor → gap risk; quote → budget item. Outputs: comparisons, briefs. Weaver: vendor-gap insights.
- **Documents** — Reads: vendors/decisions (links). Writes: `documents`, `document_links`, `uploads`. Owns: contract records/status. Ripples: contract due date → payment milestone/timeline. Outputs: signed downloads. Weaver: missing-document prompts.
- **Playlist** — Reads: guests (song requests). Writes: `playlist_tracks`, hearts. Owns: music-by-moment. Ripples: do-not-play list → vendor (DJ) brief. Outputs: playlist by moment. Weaver: gap prompts (no first-dance yet).
- **Honeymoon** — Reads: Compass, budget. Writes: `honeymoon_profiles`, `honeymoon_items`, hearts. Owns: trip decisions. Ripples: honeymoon budget → Money Map category. Outputs: trip plan. Weaver: destination/budget prompts.
- **Public Website & Printables** — Reads: guests, Master Vision, profile, seating, menus, attire. Writes: `guest_pages`, `guest_photos`, **public output versions** (§3). Owns: what is published. Ripples: publish → shareable outputs. Outputs: website, printables. Weaver: website-copy drafts (bounded).
- **Peace Notes** — Reads: nothing operational (private). Writes: `peace_notes` (encrypted). Owns: private letters/vows. Ripples: **none** (explicitly excluded from the engine snapshot — see `run.ts` `boundaries.peaceNotesExcluded`). Outputs: locked/unlocked notes. Weaver: excluded by design.

## 3. Additions required (to fully meet the directive)

**New tables (creative modules):**
- Feast Studio: `menus`, `menu_courses`, `dishes`, `dish_dietary_tags`, `dietary_requirements` (or elevate the existing `guests.dietary` text into a normalized requirement per guest so Weaver can count exactly), `caterer_briefs`.
- Atmosphere Lab: `atmosphere_profiles`, `palette_swatches`, `lighting_plans`, `floral_plans`, `tablescape_plans`.
- Atelier: `attire_looks`, `look_pieces`, `attire_rules`, `wedding_party_members` (or a role flag on `guests`).

**New tables (engine completeness):**
- **`ripple_events`** — the directive's central promise ("every meaningful change is capable of producing a visible ripple"). Columns: `id, workspace_id, source_entity_type, source_entity_id, change_summary, affected_entity_type, affected_entity_id, effect_description, magnitude, created_by, created_at, engine_run_id`. `planning_dependencies` models *dependency*, not *observed change ripples* — a distinct, needed concept.
- **`weaver_insights`** (or extend `planning_recommendations`) — add `citations_json` (the records supporting the insight), `confidence`, `uncertainty_note`, and lifecycle (`approved/dismissed/edited/deferred`) with `acted_by`/`acted_at`, so Weaver output is **cited, bounded, and auditable** as required. `recommendation_feedback` covers user reactions but not citations/confidence.
- **`public_output_versions`** — version published website/printable outputs (directive lists "public output versions").
- **`decision_history`** — decisions currently capture current state + approvals/votes + `audit_events`. If a first-class, queryable decision *history/impacts* view is needed (directive lists "decision history" and "decision impacts" explicitly), add a `decision_events` table or a typed projection over `audit_events`.

**Normalization to make Weaver counts exact:**
- Elevate free-text `guests.dietary`/`accessibility` to enumerated/normalized rows so deterministic tallies ("Checking 14 guest requirements", "Comparing the menu against 6 dietary needs") are exact, not string-parsed.

**Planner-experience tables:**
- `organizations`/`planner_orgs` distinction (a planner org that *owns* client workspaces vs. a couple workspace), `client_links`, and `templates`/`template_items` (reusable planner templates the directive requires). See permission model §Planner.

## 4. Integrity & guardrails

- **Compass versioning:** `wedding_compass.version` exists — enforce append/version-on-change so ripples can reference "since Compass v3."
- **Every consequential write emits an `audit_events` row** and, where it changes another module, a `ripple_events` row.
- **Peace Notes stay out of the engine snapshot** (already enforced in `run.ts`) and out of Weaver context.
- **No table stores another module's truth** — modules read via the snapshot/services, not by duplicating fields.
