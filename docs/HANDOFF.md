# HANDOFF - The Missing Peace (Claude -> Codex)

> **Superseded resume point (2026-07-25):** This file is retained as historical implementation
> history through the earlier waves. Resume from
> [`HANDOFF-RESUME-2026-07-22.md`](./HANDOFF-RESUME-2026-07-22.md), which records the completed
> Phase 2–5 work, Supabase Auth/workspace membership, the live Feast Studio, validation results, and
> the Maya/Julian/Aria backend-admin showcase workspace. In particular, do not restore the Clerk
> organization-switching model described below.

Work against **`The Missing Peace - Build Plan v2.md`**. It is the approved spec.
The Board is now governed by **`The Missing Peace Board Overhaul.pdf`** (2026-07-01).
**Prioritization is governed by `The Missing Peace - North Star.md`** (2026-07-06): the goal is
to replace planning.wedding / Joy / Aisle Planner — "planning.wedding on steroids." Owner
decisions recorded there: seating chart is now IN SCOPE as flagship (supersedes spec §26);
guest-facing surfaces (website, public RSVP, photo uploads) are core.
This doc is the current clean stop point as of 2026-07-06.

## Resumed — Claude, session 17 (Wave surf: guest surfaces + printables + planner seat)

Migration **`0013_guest_pages.sql`** (RUN THIS, after 0012). pglast-valid; `0000_reset`
gained guest_photos + guest_pages drops. No new enum types.

- **Public wedding website `/w/[slug]`** (Wave A/B): `guest_pages` (one per workspace; slug
  check-constrained; is_published gate; rsvp_open/photos_open/show_mood toggles) +
  `guest_photos`. Public loader `src/lib/guest-page/public.ts` exposes ONLY names/date/
  welcome/mood. Storybook landing styled by the couple's Master Vision mood line.
  Middleware: `/w(.*)` added to public routes.
- **Public RSVP `/w/[slug]/rsvp`**: "find your invitation" name search → whole-party form
  (accept/decline, meal, dietary, song request per guest) writing straight into the Guest CRM;
  the household can update its mailing address = the **contact-collector magic link** (Joy's
  killer feature) built into the same flow. Thank-you state after submit.
  Public actions in `app/w/actions.ts` — every write gated on published+open and scoped to the
  page's workspace.
- **Guest photo album `/w/[slug]/photos`**: guests upload (image-only, ≤8MB) into the private
  bucket via service role; album renders signed URLs; couple curates (hide/show) from the
  Website Studio.
- **Website Studio `/website`** (in-app): create page (slug suggested from partner labels via
  `src/lib/guest-page/slug.ts` — pure, 9 tests), publish/unpublish, edit slug/welcome/toggles,
  share links panel, guest-album moderation grid.
- **Printables pipeline `/printables` + `/print/[kind]`** (Wave A): escort cards (alphabetical,
  from Seating Studio), place cards (per table/seat w/ meal), table numbers, seating-chart
  sign, menu cards (from accepted guests' meal choices), save-the-date + invitation (names,
  date, mood). Print-ready pages with @media print CSS + a floating Print button
  (`src/components/print/PrintButton.tsx`); regenerate any time — the paper follows the plan.
- **Planner seat (Wave C minimal)**: Settings page rebuilt — Clerk `<OrganizationSwitcher/>`
  lets planners hop between weddings; the whole app follows the active org.
- Verified: vitest 27/27 (9 new slug tests), esbuild parse clean (staged copies used for
  edited files per the mount-staleness note), 0013 pglast-valid.
- NOTE: set `NEXT_PUBLIC_APP_URL` in `.env.local` so the Website Studio share links render
  absolute URLs.

## Deployment (Claude, 2026-07-06 — owner chose Cloudflare over Vercel)

Repo is scaffolded for **Cloudflare Workers via OpenNext**: `wrangler.jsonc` (nodejs_compat,
assets binding, observability), `open-next.config.ts`, package.json gained
`@opennextjs/cloudflare` + `wrangler` and `preview`/`deploy`/`cf-typegen` scripts;
`.gitignore` covers `.open-next/`, `.wrangler/`, `cloudflare-env.d.ts`, `tmp/`.
- `push-to-github.bat` — owner double-clicks to commit + create the private GitHub repo
  (gh CLI). Commits must happen on the OWNER'S machine, never from the Cowork sandbox
  (mount-staleness note above — a sandbox commit could snapshot corrupted content).
- `DEPLOY.md` — full GitHub → Workers Builds path: build vs runtime env split
  (NEXT_PUBLIC_* as Build variables — they're inlined; secrets on the Worker), Clerk
  production webhook replaces the ngrok tunnel, custom domain steps.
- `pnpm run preview` runs the app in the real workerd runtime locally; `pnpm run deploy`
  ships from the owner's machine without CI.

### Next
- Wave B remainder: digital send flow for save-the-dates/invitations (email), hotel/travel
  section on the public site (data exists in guest CRM travel fields).
- Seating follow-ups: Peacekeeper seating suggestions; rotation/resize handles; room objects
  (dance floor, DJ, bar); ceremony default rows.
- Wave C deepening: per-member roles UI in Settings; client-facing planner permissions.
- Then back to Build Plan v2 phases (Peace Notes finish, RLS defense-in-depth before launch).

## Resumed — Claude, session 16 (Seating Studio — North Star Wave A flagship)

Migration **`0012_seating.sql`** (RUN THIS, after 0001..0011). pglast-valid; text+check
constraints instead of enums so `0000_reset` only gained three table drops.

- **Tables:** `seating_charts` (reception/ceremony/custom, canvas size), `seating_tables`
  (label, shape round/rect/square/head/row, capacity 1..40, x/y/w/h/rotation),
  `seat_assignments` (chart+table+guest+seat_index; unique per seat AND unique per guest per
  chart — moving a guest re-seats them). RLS mirrors 0001/0005.
- **Geometry:** `src/lib/seating/layout.ts` — pure seat-position math (round ring, rect both
  long sides + overflow ends, head table one-sided, ceremony rows), `defaultFrame`,
  `firstOpenSeat`, `seatInitials`. 11 tests in `tests/seating.test.ts` (suite 19/19 with
  board-vision).
- **Actions:** `app/(app)/seating/actions.ts` — seedCharts (Reception+Ceremony), add/update/
  delete table (capacity shrink releases stranded seats), assignSeat (specific seat or first
  open; move semantics; friendly table_full/seat_taken results), unassignSeat, seatHousehold
  (fills open seats, skips who doesn't fit, excludes declined).
- **Studio UI:** `src/components/seating/SeatingStudio.tsx` + `app/(app)/seating/page.tsx` —
  pointer-drag tables on a dotted 1600×1000 room; seat dots ring each table (occupied = clay
  with initials, hover shows name+meal+dietary, click releases); guest sidebar grouped by
  household with RSVP dot / dietary / child markers and search; drag guest → table (auto-seat)
  or → specific seat; drag a household name → seats them together; click-guest-then-click-seat
  also works; selected-table toolbar (rename, capacity ±, remove); "X of Y accepted seated"
  → "✦ Everyone seated" celebration. Chart switcher (Reception/Ceremony). Nav gained /seating.
- Verified: esbuild parse clean (staged copy used for nav.tsx per the mount-staleness note),
  vitest 19/19, 0012 pglast-valid.

### Next (Seating Studio follow-ups)
- Print/export the chart (feeds the Wave A printables pipeline: seating chart sign, place
  cards, table numbers straight from assignments).
- Peacekeeper seating suggestions (households + relationship_group + dietary → proposed
  arrangement, user accepts — mirrors the board's "magic arrange").
- Rotation handle + resize for tables; dance floor / DJ / bar as non-seating room objects.
- Ceremony-side default rows on first open of the Ceremony chart.

## Resumed — Claude, session 15 (Board Overhaul wave 2: Master Vision, Present, tags, mood)

Migration **`0011_honeymoon_hearts.sql`** (RUN THIS, after 0001..0010). pglast-valid;
`0000_reset` drops the new table. No new enum types.

- **Master Vision auto-assembly (Overhaul acceptance standard):** the seeded `master_vision`
  board no longer renders the normal BoardView. `/board?board=<masterVision>` now assembles
  itself: every item with `disposition='approved'` across ALL other boards, grouped under its
  source board's section (newest approval first). Nothing to maintain by hand — `setDisposition`
  already revalidates `/board`. Loader `loadMasterVision()` in `board/page.tsx`; view
  `src/components/board/MasterVision.tsx`.
- **Presentation mode:** "✦ Present" on Master Vision opens a full-screen concept deck —
  cover slide (partner labels + wedding date from `wedding_profiles`, mood line), then one
  slide per section; arrow keys / click / dots to navigate, Esc closes. framer-motion.
- **Smart tagging:** `src/lib/board/tags.ts` (pure, deterministic `inferTags`) — board-type
  anchor tag + keyword + source-domain tags, max 6. Applied best-effort on `addLinkItem` /
  `addNoteItem` via `applySmartTags` (uses existing 0001 `board_tags`/`board_item_tags`; NO new
  migration). CardDrawer gained an editable Tags row (add by Enter, × to remove); actions
  `addItemTag`/`removeItemTag`; `getBoardItemDetail` now returns `tags`.
- **Mood extraction:** `src/lib/engine/mood.ts` — deterministic descriptor-frequency reading
  (`deterministicMood`, always works offline) + optional Claude polish when ANTHROPIC_API_KEY
  is set and ≥4 approved items. Master Vision shows "The mood so far" with ✨ Read the mood and
  "Weave into Compass" (persists to `dreams.responses_json.boardMood` — no migration). Actions
  in `app/(app)/board/mood.ts`.
- **Honeymoon activity voting (carry-over):** per-user hearts on honeymoon items
  (`toggleHoneymoonHeart` + `src/components/honeymoon/Heart.tsx`); most-loved rises to the top
  of its group; page hydrates counts + my-heart.
- **Whole-board drag-and-drop (carry-over):** the entire board body (gallery AND canvas) is now
  a file drop target with a "Let it fall onto the board ✦" overlay (depth-counted dragenter/leave,
  only reacts to real file drags). The AddBar dropzone remains.
- **Tests:** `tests/board-vision.test.ts` — 8 new tests (inferTags anchors/keywords/domains/cap,
  deterministicMood leanings/empty/cap). All green.
- Verified: esbuild parse sweep clean over all new/changed files; 0011 pglast-valid.

### ⚠ Tooling note — sandbox mount staleness (2026-07-02)
The Cowork Linux sandbox mount served STALE sizes for files EDITED via Claude's file tools this
session (new files synced fine; edited files were readable only up to their old byte count —
looked exactly like the historic truncation corruption, but the Windows-side files were complete
and correct). If an esbuild sweep suddenly reports dozens of "Unexpected end of file" errors
right after editing, suspect the mount cache first: verify the real file via a Windows-side read
before "repairing" anything, and run parse checks against freshly staged copies if needed.
Do NOT write "repairs" through the mount in that state.

Run order: 0000_reset -> 0001 -> ... -> 0011 -> 0012 -> **0013**.

### Next
- Board Overhaul wave 3 candidates: reactions (emoji, distinct from votes), approval policy
  (both partners / planner may approve), widgets (poll, countdown, palette), magic arrange
  (Peacekeeper suggests an arrangement, user accepts), mobile stack view, section covers /
  collage touches. Peace Center could surface `boardMood` alongside Dream Status.

## Tweak — Vendor + Guest field completeness (Claude)

Migration **`0010_vendor_guest_fields.sql`** (RUN THIS, after 0001..0009). Additive, idempotent,
no new enum types (so `0000_reset` unchanged).

- **Vendors (spec §12):** added inquiry_date, response_date, availability, contract_status,
  deposit_amount, payment_schedule, cancellation_terms, insurance_required, meals_required,
  arrival_time, departure_time, setup_time, breakdown_time. Create form gets a collapsible
  "Contract, payments & day-of logistics" section; cards show contract/deposit/availability/
  payment/cancellation chips + day-of times + insurance/meals flags. `createVendor` reads them all.
- **Guests (spec §13):** added preferred_name, pronouns, guest_group, invited_rehearsal,
  invited_other_events, hotel_status, transportation_need, gift_received, thank_you_note_status.
  Households gained primary_contact + invitation_status. Create forms + row quick-edit capture
  them; added Rehearsal and Children views; CSV export includes the new columns.
- No seating fields — seating chart is explicitly out of v1 scope per spec §26.
- Full esbuild sweep clean; all migrations pglast-valid.

Run order: 0000_reset -> 0001 -> ... -> 0009 -> **0010**.

## Tweak — Module enrichments (Claude)

Migration **`0009_module_enrichments.sql`** (RUN THIS): `playlist_tracks.approval_status` enum,
`documents` (contract_status, due_date, notes, linked_vendor_id, linked_decision_id),
`decisions.linked_dream_value`. `0000_reset.sql` drops the new type.

- **Playlist:** per-song approval status (proposed/approved/declined) control + accurate
  "needs approval" count (`setTrackApproval`).
- **Documents:** type + contract status + due date + linked vendor/decision + notes on create;
  list shows them; still supports file upload + signed download.
- **Decisions (elevated):** options + one-vote-per-person voting, final choice + rationale +
  linked Dream value (datalist from Compass priorities), full status set. Actions:
  `addDecisionOption`, `voteDecisionOption`, `setDecisionFinal` in `planning/actions.ts`.
- **Timeline:** roadmap gained **Milestones** and explicit **Dependencies** (task → depends-on-task
  + reason). Actions: `createMilestone/deleteMilestone/createDependency/deleteDependency`.
  (Run of Day + roadmap split already existed.)
- Full esbuild sweep clean; migrations pglast-valid.

Run order now: 0001 → 0002 → 0003(opt) → 0004 → 0005 → 0006 → 0007 → 0008 → **0009**.

## Tweak — Dream follow-ups + Peace Center thread (Claude)

- **Dream drag persistence:** dragging a cloud toward/away from the Compass now saves a priority
  (0..1) into `dreams.responses_json.cloudPriorities` via `saveCloudPriority` (no migration). On load,
  the orbit radius is derived from priority (closer = higher priority), so it persists across sessions.
- **Dream reveal sparkle:** clouds sparkle for ~2.6s on reveal (data-spark) in addition to hover/active.
- **Compass approval persistence:** the Dream "Approve" button calls `approveCompass` →
  `responses_json.compassApproved`; the Peace Center **Dream Status** now shows "Compass approved".
- **Peace Center note:** the command center was ALREADY complete (Compass summary, Dream Status,
  Peace Score, Next Best Actions w/ owner+reason+module+action, Decision Queue, deduped Risk Radar,
  Vendor Gaps, Money Map Pressure, Guest Count Impact, Recent Activity). No rebuild needed — only the
  approval thread was added. (My earlier "only 2 sections" note was a grep false-negative.)
- All touched files esbuild-clean.

## Tweak — Dream Workspace redesign (Claude, visual iteration)

`app/(app)/dream/DreamWorkspace.tsx` + cloud CSS in `app/globals.css` rebuilt into the
"Dream Clouds" composition (owner-approved settled state):
- Title "Your Dream Clouds"; Wedding Compass is a small (172px) soft central seal (Approve only
  shows once a Compass exists). Clouds are fluffy SVG silhouettes (gradient fill + soft glow),
  text embedded in the belly (no oval plate), quiet labels, sparkles on hover/active only.
- Loose orbit via px offsets on a wide ellipse (clouds settle fully clear of the Compass);
  ResizeObserver scales the orbit + cloud size to the scene width (responsive on laptops);
  <lg falls back to a centered Compass + stacked clouds.
- Reveal: clouds start clustered at the Compass then drift outward (framer-motion, staggered).
  Hover lifts/glows/brings-to-front; click opens a right-side detail drawer (reflection, tags,
  Poof → Decision / Money Map / Timeline / Peace Note); drag pulls clouds toward/away from Compass.
- Parses clean (esbuild). FOLLOW-UPS: persist drag distance as a `priority` field (session-only now);
  optional one-shot sparkle on a newly-created cloud.

## Resumed - Codex, session 13 (Money Map implementation)

- **Money Map shipped over the old Budget page.** Route remains `/budget`, but nav and major
  user-facing labels now say Money Map.
- Added `src/lib/engine/money-map.ts`: location benchmark matching, guest-count adjustment,
  wedding-type adjustment, likely range, fit reading, category suggestions, pressure points,
  first decisions, and Compass-alignment notes.
- Rebuilt `app/(app)/budget/page.tsx` around `MoneyMapWorkspace.tsx`: interactive location,
  guest count, target budget, wedding type, visual fit reading, category containers,
  estimated -> quoted -> committed -> paid flow, payment milestones, contributions, scenarios,
  and estimate-source assumptions.
- Added server actions in `app/(app)/budget/actions.ts` for Money Map setup, categories, items,
  payment milestones, contributions, and scenarios.
- Added migration **`supabase/migrations/0008_money_map.sql`** (RUN THIS): cost benchmarks,
  cost estimate runs, payment milestones, contributors/contributions, scenarios/scenario items,
  budget alerts, financial activity logs, wedding location/type fields, and seeded benchmark rows.
  `0000_reset.sql` also drops the new objects.
- Existing Claude-owned language files in `src/lib/money-map/` were left intact.
- Verified: TypeScript passed, unit tests passed (15/15), production build passed, local preview
  restarted at `http://localhost:3000`.

## Resumed — Claude, session 12 (Money Map language + guidance kit)

Codex owns the Money Map engine + tables (cost_benchmarks, cost_estimate_runs, budget plans,
scenarios, contributions, payment milestones). **Claude owns the language/guidance** — delivered:
- `src/lib/money-map/benchmarks.json` — cost benchmark SEED (The Knot 2026: national $34,200 avg,
  117 guests, $292/guest; states + cities as provided) + wedding-type modifiers. Feeds cost_benchmarks.
- `src/lib/money-map/language.ts` — deterministic guidance: `likelyRange`, `budgetFit`
  (peaceful/close/stretched/at_risk), `estimateNarrative`, `whatCanThisBudgetHold`,
  `guestCountPressure`, `tradeoffSuggestions` (protect Compass, trim flexible first),
  `nextBestFinancialActions`, `MONEY_MAP_TONE`. Pure/testable; Codex can swap the math and keep the words.
- `src/lib/money-map/peacekeeper-money-map.txt` — AI narration prompt (calm, ranges, Compass-first,
  cite source, JSON output).
- `MONEY-MAP-LANGUAGE.md` — voice guide + the worked Indianapolis example + Peace Engine triggers.
- `tests/money-map.test.ts` — 7 tests (range not exact, fit reading, source cited, calm guest framing,
  Dream-protecting tradeoffs). Full suite now 18/18 green.

How Codex wires it: estimate engine computes numbers → pass into `language.ts` (or the Peacekeeper
prompt) to render the copy the Money Map UI shows. Always show benchmark source; never exact promises.

### Next
- Money Map UI (Codex); honeymoon activity voting; drag-and-drop board upload.
## Resumed — Claude, session 11 (favorites filter + guest views)

- **Board favorites filter:** a ♥/♡ toggle in the board toolbar filters Gallery + Canvas to
  favorited fragments. (No migration.)
- **Guest views:** filter chips on the Guests page — Everyone / Awaiting RSVP / Coming / Traveling /
  Needs address (households missing a mailing address). Server-rendered via `?view=` param; add
  forms + meal tally show on the default view. (No migration.)
- Both parse clean.

### Next
- Honeymoon activity voting (needs a small hearts migration like the playlist);
  drag-and-drop file upload onto the board; VIP flag + guest CSV export.
## Resumed — Claude, session 10 (file uploads)

- **File uploads shipped.** Migration **`supabase/migrations/0007_storage.sql`** creates a private
  `uploads` bucket (RUN THIS). `src/lib/supabase/storage.ts` (uploadFile + signed URLs, service role).
  - **Board:** "⬆ Upload" button (image/PDF) → `app/(app)/board/upload.ts`; board cards render
    uploaded images via short-lived signed URLs (PDFs/files link out). Files become real board items
    (poofable, favoritable, attributed).
  - **Documents:** add form now takes a file (`app/(app)/documents/upload.ts`); each doc with a file
    shows a signed download link.
  - Private bucket; app serves via 7-day signed URLs generated server-side. No storage RLS needed
    (service role). Body limit is 10mb (next.config).
- Run order now: 0001 → 0002 → 0003(opt) → 0004 → 0005 → 0006 → **0007**.
- Full esbuild parse sweep: clean.

### Next
- Honeymoon activity voting; guest views (needs-address, VIPs); a "favorites only" board filter;
  drag-and-drop file upload onto the board.
## Resumed — Claude, session 9 (board attribution + favorites)

- **Favorite hearts + attribution on board cards.** `BoardItemCard` now has a ♥ heart
  (top-right, blooms on hover; `toggleFavorite` in `board/actions.ts`) and an "added by
  {name}" line with avatar. `board/page.tsx` hydrates `is_favorite` + `created_by` and resolves
  adder names; `BoardItemView` gained `isFavorite/addedByName/addedByAvatar`. No new migration
  (columns already in 0001). Parses clean.

### Next
- Storage uploads (board images/PDFs + documents); honeymoon activity voting;
  guest views (needs-address, VIPs); a "favorites" board filter.
## Resumed — Claude, session 8 (Honeymoon module)

- **Honeymoon module shipped** — migration **`supabase/migrations/0006_honeymoon.sql`** (RUN THIS:
  adds `honeymoon_profiles` + `honeymoon_status` enum; `honeymoon_items` already exists from 0001).
  Actions `app/(app)/honeymoon/actions.ts` (save trip details, add/delete items). Page
  `app/(app)/honeymoon/page.tsx` — enchanted "forever trip": destination/dates/budget/status hero,
  plus an "add a dream" composer grouped into Destinations, Flights, Stays, Activities, Tables,
  Packing, Documents. Saving the trip also flips `wedding_profiles.honeymoon_enabled = true`.
  Nav entry added. Types added. Parses clean.
- Run order now: 0001 → 0002 → 0003(opt) → 0004 → 0005 → **0006**.

### Next
- Board per-card attribution + favorite hearts; Storage uploads (board images + documents);
  honeymoon activity voting; guest views (needs-address, VIPs).
## Resumed — Claude, session 7 (guest depth + song requests → playlist)

- **Guest depth:** add-guest form now captures dietary, traveling-from, plus-one, and song request;
  guest rows show 🍽/✈/♪ details; header adds a "traveling" stat and a **meal-count tally** (accepted
  guests grouped by meal choice). Uses existing `0005` columns — no new migration.
- **Song requests → playlist:** each guest's ♪ request has a **"→ playlist"** button
  (`sendSongToPlaylist`) that drops the song onto the dance-floor playlist, noting who asked for it.
- Parses clean.

### Next
- Board per-card attribution + favorite heart; Storage uploads (board images + documents);
  guest views (needs-address, VIPs); the Honeymoon module.
## Resumed — Claude, session 6 (Guest CRM)

- **Guest CRM shipped** — migration **`supabase/migrations/0005_guests.sql`** (RUN THIS: adds
  `households` + `guests` + `rsvp_status` enum + RLS). Actions `app/(app)/guests/actions.ts`
  (create/delete household, create/delete guest, update RSVP+meal). Page `app/(app)/guests/page.tsx`
  — enchanted hospitality book: invited/accepted/declined/awaiting counts, add-household +
  add-guest forms, guests grouped by household with inline RSVP + meal, plus an individuals section.
  Types added to `src/lib/types.ts`. Parses clean.
- Run order now: 0001 → 0002 → 0003(optional) → 0004 → **0005**.

### Next
- Guest depth: plus-one names, dietary/accessibility/travel fields in the UI; meal-count tally;
  guest views (needs address, traveling, VIPs); feed `song_request` into the playlist.
- Board: per-card attribution + favorite heart. Storage uploads (board images + documents).
## Resumed — Claude, session 5 (more repairs, run/webhook docs, self-heal invites)

- **More move-corruption found + fixed:** `vendors`, `decisions`, `timeline`, `documents` pages
  were also truncated (a column-counting scan missed them; an **esbuild parse sweep over all 50
  ts/tsx files** is the authoritative check and now passes clean). All four rebuilt — enchanted and
  wired to `app/(app)/planning/actions.ts` (add / status / delete). `guests` is an enchanted
  placeholder (guest CRM is the next real build; tables already exist in 0001).
- **Run helpers:** `HOW-TO-RUN.md` (plain-English restart/clear-cache) and `restart-dev.bat`
  (double-click: clears `.next`, starts the app).
- **Webhook guide:** `WEBHOOK-SETUP.md` (ngrok tunnel + Clerk endpoint steps).
- **Invites work without a webhook:** `src/lib/workspace/sync.ts` + `getActiveWorkspace()` now
  self-heal — on sign-in, an invited member's user/workspace/membership rows are created from their
  active Clerk org (role from invitation `publicMetadata.appRole`). Webhook remains the prod path.
- Verified: full esbuild parse sweep clean (50/50); unit tests 11/11.

### Tooling note for future sessions
Detect truncation with an **esbuild parse sweep**, not brace counting:
`find app src -name '*.ts*' | xargs -I{} esbuild {} --format=esm --jsx=automatic >/dev/null`

### Next
- Guest CRM (households, RSVP, meals, travel) — enchanted, on the existing guests/households tables.
- Board: per-card attribution + favorite heart (hydrate created_by / is_favorite).
- Storage uploads for board images + documents.
## Resumed — Claude, session 4 (corruption repair + invites + prompts)

- **CRITICAL repair:** the folder move had truncated/corrupted several Codex files (build-breaking).
  Repaired to clean, parsing versions: `app/(app)/board/{add-item.ts,page.tsx}`,
  `app/(app)/budget/page.tsx`, `app/api/liveblocks-auth/route.ts`,
  `app/api/webhooks/clerk/route.ts`, `src/components/board/BoardView.tsx`,
  `src/lib/engine/peacekeeper.ts`; and stripped NUL padding from `app/(app)/board/actions.ts`
  + `src/lib/supabase/rls.ts`. Repo-wide brace/NUL scan is now clean; all files esbuild-parse.
  (If you have a newer Codex copy of any of these, diff before overwriting.)
- **Board rebuilt with the requested vibe:** `BoardView` now offers **Gallery** (calm Pinterest
  masonry, default) + **Canvas** (spatial drag with live cursors), a presence indicator
  ("N here with you"), and the enchanted `BoardItemCard` (hover-bloom controls).
- **Landing copy:** "✦ Begin your dream · create an account" and "I have a dream already · sign in".
- **Who's dreaming prompt:** onboarding asks couple vs wedding planner (`creatorRole`, saved in the
  Dream responses; planner-mode wiring is a future step).
- **Invite your circle:** `src/components/InviteCircle.tsx` + `app/(app)/peace-center/invite.ts`
  (Clerk org invitation; app role carried in publicMetadata). Button is in the Peace Center header.
  NOTE: an invited member's `workspace_members` row is created by the **Clerk webhook** on accept —
  so for invites to fully land, the webhook must be reachable (tunnel in local dev) and
  `CLERK_WEBHOOK_SECRET` set. The invite email itself sends without it.
- No new migration this round (creatorRole rides in `dreams.responses_json`; invites use Clerk).

## Resumed — Claude, session 3 (enchanted Peace Center, collaboration, playlist)

- **Peace Center redesigned** (`app/(app)/peace-center/page.tsx`) — airy, storybook feel:
  Compass as the "north star" hero, a calm Peace Score chip, "Next, with love" recommendation
  cards, "A gentle watch" risks. Keeps the existing live data + `runPeaceEngineAction`.
  Redirects to `/onboarding` if there's no active workspace (the guard we noted).
- **Collaborative attribution** — "What's stirring" strip shows who added what & when
  (recent board items / vendors / decisions joined to users), plus your circle's avatars in the
  header. (Real-time cursors/presence already live on the Board via Liveblocks; extending live
  presence app-wide is a future enhancement. Peace Notes are excluded from all of this.)
- **Playlist (NEW, collaborative)** — paste a Spotify/Apple/YouTube link (we read the title) or
  add by hand; organized by moment (ceremony, cocktail, dinner, first dance, dance floor, do-not-play);
  per-user hearts; attribution ("added by …").
  - Migration **`supabase/migrations/0004_playlists.sql`** — RUN THIS in Supabase (adds
    `playlist_tracks` + `playlist_track_hearts` + enums + RLS).
  - `app/(app)/playlist/{page.tsx,actions.ts}`, `src/components/playlist/{AddSong,Heart}.tsx`,
    types in `src/lib/types.ts`, nav entry added.
- All changed/new files esbuild-parse clean; braces balanced.

### Run order reminder (Supabase SQL editor)
`0001_init.sql` → `0002_rls_helper.sql` → `0003_clerk_jwt_rls.sql` (optional, RLS hardening) →
**`0004_playlists.sql`** (required for the playlist).

### Next (carry the enchantment further)
- Board: card aesthetic DONE (`BoardItemCard.tsx` — image-forward, hover-bloom controls, source
  chip, set-in-peace ribbon; drag wiring untouched). Still to do: masonry/column layout option,
  per-item attribution + favorite heart (needs `created_by`/`is_favorite` hydrated into the store).
- Guest song requests → feed into the playlist (spec guest `song_request`).
- Optional: real Spotify/Apple integration + live app-wide presence avatars.

## Resumed — Claude, session 2 (enchanted Dream + onboarding fix)

- **Bug fixed:** `app/(app)/onboarding/page.tsx` and `onboarding/actions.ts` were truncated
  mid-file (lost in the folder move) and the page imported a non-existent action — onboarding
  could not build. Both rewritten and syntax-checked.
- **Onboarding now self-contained:** `createWorkspaceFromOnboarding(formData)` creates the Clerk
  org + upserts the Supabase user/workspace/owner-membership INLINE (no webhook needed for local
  dev), applies profile + Dream + Compass + seed, then redirects to `/peace-center`.
  `ensureUser()` upserts the signed-in Clerk user on demand.
- **Enchanted redesign (per product direction — Disney-fantasy, vision-board feel):**
  - `app/page.tsx` — storybook landing (arches, twinkles, petals, "Where forever begins").
  - `app/(app)/onboarding/page.tsx` — "What does forever look like?" opening: warm, few-question,
    priority chips, honeymoon on by default. Posts to the action above.
  - `app/globals.css` — added DREAM DECOR motion tokens (twinkle/float/bob; respects reduced-motion).
  - Auth pages set `forceRedirectUrl`: sign-up → `/onboarding`, sign-in → `/peace-center`.

### Next (carry the enchantment inward)
- Make the **Peace Center** and **Board** feel like the decorative vision board too (cards, warmth,
  gentle "intelligence as whispers" chips — budget/location/integration), not a dashboard.
- Add a guard: if a signed-in user has **no active workspace**, redirect `/peace-center` → `/onboarding`
  (currently `requireActiveWorkspace()` would throw).
- Wire Google Maps Places for the location intelligence; surface "pulled from Pinterest" on link cards.

## Current Status

The canonical app lives in **`C:\Users\siddi\Documents\The Missing Peace`**.

The local dev server was restarted cleanly after a stale `.next` asset problem and is running at:

`http://localhost:3000`

The in-app browser currently renders Clerk sign-in correctly at:

`http://localhost:3000/sign-in`

If the browser shows raw/unstyled HTML again, stop the process on port 3000, delete only `C:\Users\siddi\Documents\The Missing Peace\.next`, then restart `next dev`.

## What Is Built

- **Project setup:** Next.js App Router, TypeScript, Tailwind, Clerk, Supabase, Liveblocks, Anthropic, Vitest.
- **Environment:** `.env.local` has the core live keys. Stripe is intentionally left for later.
- **Auth shell:** `app/layout.tsx` wraps the app in `<ClerkProvider>`.
- **Middleware:** `middleware.ts` protects app routes and redirects typo paths:
  - `/sign_in` -> `/sign-in`
  - `/sign_up` -> `/sign-up`
- **Supabase admin client:** `src/lib/supabase/admin.ts` uses the backend secret key for trusted server code.
- **RLS user client:** `src/lib/supabase/rls.ts` now uses Clerk's current Supabase integration pattern via `accessToken: async () => getToken()`.
- **RLS migration:** `supabase/migrations/0003_clerk_jwt_rls.sql` was added. It changes `auth_workspace_ids()` to read the Clerk user id from `auth.jwt()`, with fallback to the old GUC for compatibility.
- **Permissions:** `src/lib/auth/permissions.ts` capability map is in place.
- **Workspace helper:** `src/lib/workspace/current.ts` resolves the active Clerk user/org to an active `workspace_members` row and role.
- **Clerk webhook:** `app/api/webhooks/clerk/route.ts` now syncs:
  - users
  - organizations -> workspaces
  - organization memberships -> workspace_members
- **Onboarding bootstrap:** `app/(app)/onboarding/page.tsx` is now a real first-run form.
- **Onboarding action:** `app/(app)/onboarding/actions.ts` can:
  - create a Clerk organization
  - create/upsert the Supabase user
  - create/upsert the workspace
  - create owner membership
  - save wedding profile
  - save Dream + Wedding Compass
  - seed boards/collections/budget categories
- **Workspace generation:** `src/lib/workspace/generate.ts` seeds boards, collections, budget categories. Milestones and first engine run are still TODO.
- **Board:** `app/(app)/board/page.tsx` resolves active workspace, loads the first board, and hydrates real board items/positions.
- **Board canvas:** `src/components/board/BoardView.tsx` replaced the static grid with a Liveblocks-backed spatial canvas:
  - add link
  - drag cards
  - cursor presence
  - persisted card positions via `app/(app)/board/position.ts`
- **Board mutations:** `app/(app)/board/add-item.ts` checks workspace membership + `board.add` before writing.
- **Liveblocks auth:** `app/api/liveblocks-auth/route.ts` now validates `board:{boardId}` against workspace membership before issuing a room token.
- **Poof engine:** `src/lib/poof.ts` is implemented. Board actions enforce active workspace membership before prefill/poof/unpoof.
- **Poof UI:** `src/components/board/PoofMenu.tsx` + `PoofConfirm.tsx` — the confirm/edit step is DONE (loads `getPoofPrefill`, editable fields with a category <select> for vendor/task/decision, commits via `poofAction` with overrides). Syntax-checked; board item is preserved (additive/reversible).
- **Planning CRUD UIs:** these stubs are now live database-backed pages:
  - `app/(app)/vendors/page.tsx`
  - `app/(app)/budget/page.tsx`
  - `app/(app)/decisions/page.tsx`
  - `app/(app)/timeline/page.tsx`
  - `app/(app)/documents/page.tsx`
- **Shared planning actions:** `app/(app)/planning/actions.ts` contains create/update/delete actions with active workspace + `plan.full` checks.
- **Peacekeeper AI call:** `src/lib/engine/peacekeeper.ts` now calls Anthropic and parses strict JSON.
- **Peace Engine runner:** `src/lib/engine/run.ts` gathers workspace context, deterministic facts/risks, calls Peacekeeper, writes `planning_engine_runs`, `planning_recommendations`, and `planning_risks`.
- **Peace Center:** `app/(app)/peace-center/page.tsx` now reads live Compass/recommendations/risks and has a "Run Peace Engine" action.
- **Peace Center action:** `app/(app)/peace-center/actions.ts` runs the engine with permission checks.
- **Dev helper scripts:** in this Codex thread workspace:
  - `work/check-env.js`
  - `work/live-counts.js`
  - `work/rls-check.js`

## Verification Done

- `.env.local` redacted check passed for core services.
- Clerk API probe passed.
- Supabase schema probe passed.
- `set_clerk_user` helper exists, but see RLS note below.
- Anthropic model list probe passed; key can see `claude-sonnet-4-6`.
- TypeScript passed after the latest sign-in/middleware/Supabase helper changes.
- Unit tests passed: 11 tests across 3 files.
- Production build passed after major implementation pass.
- Local sign-in page now renders after clearing stale `.next` cache and restarting dev server.

## Critical RLS Note

> **Clarification (Claude, 2026-06-30):** the app is NOT blocked on this. Every page/server action
> uses the service-role client **scoped by the Clerk-resolved workspace** via
> `requireActiveWorkspace()` / `requireWorkspaceMember()` (`src/lib/workspace/current.ts`). That
> service-layer authorization is the real enforcement today and works end-to-end. The Clerk-JWT RLS
> (migration `0003` + the Clerk↔Supabase third-party-auth dashboard setup) is **defense-in-depth** to
> finish before launch — not required to onboard or use the app now. `supabaseForUser()` (the RLS
> client) is currently unused by pages.


The original `set_clerk_user` GUC approach **does not prove RLS over Supabase HTTP**. A disposable live test showed:

`RLS_ISOLATION=ERROR: User A saw: nothing`

Reason: the RPC that sets the GUC runs in one transaction/request, then the next PostgREST query does not retain that setting.

Decision made: use Clerk's current Supabase integration / Clerk-issued token instead.

Required setup before final RLS proof:

1. In Clerk, enable/connect the Supabase integration.
2. In Supabase Auth, enable Clerk as third-party auth.
3. Run `supabase/migrations/0003_clerk_jwt_rls.sql` in Supabase SQL Editor.
4. Then update/re-run `work/rls-check.js` to use real Clerk-issued tokens if possible, or add an app-route-level integration test that calls `supabaseForUser()` while signed in.

## Live Database State

Last count check showed the live DB was empty:

- users: 0
- workspaces: 0
- workspace_members: 0
- boards: 0
- board_items: 0
- vendors: 0
- budget_items: 0
- decisions: 0
- tasks: 0
- planning_engine_runs: 0

After sign-in, go to `/onboarding` and submit the form to create the first workspace and seed data.

## Start Here Next

1. Confirm Clerk sign-in works in browser at `/sign-in`.
2. Complete Clerk/Supabase native auth setup:
   - Clerk Supabase integration
   - Supabase Auth third-party Clerk provider
   - run `0003_clerk_jwt_rls.sql`
3. Sign in locally and visit `/onboarding`.
4. Submit onboarding and verify Supabase now has:
   - 1 user
   - 1 workspace
   - 1 active owner membership
   - seeded boards
   - seeded budget categories
   - wedding profile
   - wedding compass
5. Visit `/board` and verify a seeded board loads.
6. Paste a link onto the board and verify:
   - `link_previews` row
   - `board_items` row
   - `board_item_positions` row
   - card appears on canvas
7. Drag a card and verify `board_item_positions` updates.
8. Run Peace Engine from `/peace-center` and verify:
   - `planning_engine_runs`
   - `planning_recommendations`
   - `planning_risks`
9. [DONE — Claude, 2026-06-30] Poof confirm/edit step shipped (`PoofConfirm.tsx`).
   Next on the loop: surface a "Became" list (the board_item_links children) in the item drawer,
   and an Un-poof control wired to `unpoofAction`.
10. Add Supabase Storage uploads for board images/PDFs/screenshots.
11. Finish Peace Notes service/UI carefully. Do not leak locked bodies.

## Known Gaps

- `0003_clerk_jwt_rls.sql` has been written but likely not ye

## Codex - Phase 0 boundary work (2026-07-21)

- **Canonical repository/path:** `https://github.com/kiddsiid/themissingpeace` with the product
  working tree at `C:\Users\siddi\Documents\The Missing Peace`. The old `...\Documents\TMP`
  path does not exist. The product source branch is `codex/update-prototype-from-zip`.
- **Audit corrections:** the canonical repository contains the Next.js product and its standalone
  prototype materials. The live suite is 42 tests, not 27.
- **Secrets:** `.env.local` is ignored, untracked, and absent from all Git history; `.env.example`
  is the only tracked env file. No live-key-shaped values were found by the masked history scan.
- **Hygiene:** added `*.tsbuildinfo` to `.gitignore` and untracked `tsconfig.tsbuildinfo` while
  preserving the ignored local cache. The two ZIP archives and all listed build outputs were already
  untracked and ignored. Removed seven ignored `tmp/claude-prototype-*` working folders and the empty
  legacy `cloudflare-page/` directory. Retained `cloudflare-pages/` as the product Pages target and
  `cloudflare-prototype/` as the demo target.
- **Docs:** moved North Star, Build Plan v2, and this handoff under `/docs`; kept the full Phase 0
  document set under `/docs/phase-0`; all Phase 0 README links resolve.
- **Verification:** `pnpm install` up to date; `pnpm typecheck` passed; Vitest passed 42/42 across
  7 suites; `pnpm build` passed (28 routes); esbuild parsed all 105 files under `app/` and `src/`
  with zero failures.
- **Preserved/deferred:** retained `prototype/*.html`, both deploy targets, and all pre-existing
  owner canvas/prototype work. Did not run or edit migrations, RLS, dashboards, or Phase 1 features.
  The pre-existing final Known Gaps sentence above was already truncated in committed history and
  was preserved rather than reconstructed from guesswork.
