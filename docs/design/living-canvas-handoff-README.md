# Handoff: Living Canvas + Creative Studios (Feast · Atmosphere · Atelier), Money Map & Homepage

## Overview

This package delivers the redesigned **creative half** of The Missing Peace wedding engine. It replaces the single monolithic **Board** with a **Living Canvas** hub that opens into three focused creative studios, plus the refreshed **Money Map** and marketing **Homepage / Dream Walk entry**.

The core change: **retire `/board`** and stand up in its place —

1. **Living Canvas** — a doorway hub. Pick one of three rooms to focus on; each shows a live progress ring pulled from shared state; clicking plays a themed entrance animation into that room.
2. **Feast Studio** — the menu / hospitality studio (the meal as the event).
3. **Atmosphere Lab** — the palette & mood control room; recolors a live "day preview" of 10 wedding surfaces.
4. **The Atelier** — a fashion studio for composing wedding-party looks with approvals.
5. **Money Map** — living budget (refreshed; maps to existing `/budget`).
6. **Homepage** — the public marketing front / "step through the door" entry into the Dream Walk.

## About the Design Files

The files in this bundle are **design references authored in HTML** — high-fidelity prototypes showing the intended look, layout, copy, and interaction. **They are not production code to copy directly.** Each one is a self-contained `.html` document built on a small custom runtime (`support.js`, referenced as `<x-dc>` + a `data-dc-script` class). That runtime is a prototyping shim — **do not port it.**

Your task is to **recreate these designs inside the existing Next.js app** at `_reference_nextjs/` (App Router, React Server + Client Components, Tailwind, TypeScript), reusing its established patterns:

- Route groups under `app/(app)/<route>/` with a `page.tsx` (+ `actions.ts` server actions where writes happen, + a client `*Workspace.tsx`/`*Studio.tsx` for interactive UI — this is exactly how `budget/MoneyMapWorkspace.tsx`, `dream/DreamWorkspace.tsx`, `board/BoardView.tsx`, and `seating/SeatingStudio.tsx` are already structured).
- Design tokens from `app/globals.css` (`--pearl`, `--clay`, `--sage`, `--voice` font, etc.) — **all colors below are already CSS variables in that file.**
- Nav from `src/components/nav.tsx`.
- The real logic engine in `src/lib/engine/` and typed data model in `src/lib/types.ts`.

Where the prototype keeps state in `localStorage` via `wedding-state.js`, the real app persists via **server actions + Supabase** (see any existing `actions.ts`). Treat `wedding-state.js` (included here) as the **canonical data shape**, not the storage mechanism.

## Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate pixel-faithfully using the codebase's Tailwind tokens and component patterns. The custom prototype runtime, the `<x-dc>` wrapper, and the `renderVals()` structure are scaffolding — reproduce the *rendered result and behavior*, implemented idiomatically in React/TSX.

---

## Integration Map (do this first)

**1. `src/components/nav.tsx`** — In the `NAV` array, replace:

```ts
{ href: '/board', label: 'The Board', icon: 'board' },
```

with a Living Canvas entry (the three studios are reached *through* it, not as top-level nav — matching the prototype, where they're sub-items):

```ts
{ href: '/canvas', label: 'Living Canvas', icon: 'board' },
```

Also update `MOBILE_NAV`: swap `'/board'` → `'/canvas'`.

**2. Routes to create** under `app/(app)/`:

| New route | Replaces / adds | Prototype file |
|---|---|---|
| `canvas/page.tsx` (+ client `LivingCanvas.tsx`) | replaces `board/` hub | `Living Canvas.html` |
| `canvas/feast/page.tsx` (+ `FeastStudio.tsx`, `actions.ts`) | new | `Feast Studio.html` |
| `canvas/atmosphere/page.tsx` (+ `AtmosphereLab.tsx`, `actions.ts`) | new | `Atmosphere Lab.html` |
| `canvas/atelier/page.tsx` (+ `Atelier.tsx`, `actions.ts`) | new | `Atelier.html` |
| `budget/MoneyMapWorkspace.tsx` | update in place | `Money Map.html` |
| `app/page.tsx` / marketing entry | update | `Homepage.html` |

**3. Retire `/board`.** After the Living Canvas + studios are in, delete `app/(app)/board/` and `src/components/board/*` **only if** no data migration is needed — the studios read/write the same `board.*` slice of the data model (see below), so the underlying data is preserved; only the UI is replaced. Keep `src/lib/board/store.ts` / `tags.ts` if the studios reuse them.

**4. Data model.** Everything reads from and writes to the `board` slice already defined in the data model (`wedding-state.js` here → `src/lib/types.ts` + Supabase in the app):
- **Feast Studio** ↔ `board.food` (`courses[]`, `dishes[]`, `restrictions[]`, `guestCoverage[]`, `moods`, `bar`, …)
- **Atmosphere Lab** ↔ `board.palette` (`colors[]`, `roles[]`, `atmosphere[]`, `journey[]`) + `wedding.light`, `wedding.season`
- **The Atelier** ↔ `board.attire` (`dressCode`, `rules[]`, `looks[]` with `approvals`)
- **Living Canvas** reads derived progress from all three slices + `WeddingState.peaceScore()`

---

## Design Tokens

All already defined in `app/globals.css` — use the CSS variables, do not hardcode.

**Colors**
- `--pearl #FCF9F3` (raised surfaces / cards)
- `--cream #F6F1E8` (page background, inset inputs)
- `--ink #3A3631` · `--ink-soft #7A726A` · `--ink-faint #A99A86` (text hierarchy)
- `--line #E5DCCD` (borders)
- `--gold #B8924A` / `--gold-bg #F4ECDA` (accent, "sacred"/blessed)
- `--sage #8A9A80` / `--sage-bg #EDF0E9` (positive / on-track / approved)
- `--clay #BC7459` / `--clay-ink #8A4A33` / `--clay-bg #F3E2DB` (primary action / warnings / active nav)
- `--blush #E7D2C8` (soft accent)
- Studio entrance-wash colors (Living Canvas only): Feast `#8A4A33`, Atmosphere `#566049`, Atelier `#7C5470`

**Wedding palette** (the couple's, shown/edited in Atmosphere Lab; seed = "Sage & Clay"): `#8A9A80` Primary · `#BC7459` Secondary · `#E7D2C8` Accent · `#F1EBDD` Neutral · `#3A3631` Ink.

**Typography**
- Body: `Inter` (400/500/600) via `--font-sans`
- Display / "voice": `Cormorant Garamond` (500/600/700) via `--font-voice`, applied with `.voice` — used for all headings, numbers in summary bands, and serif italic "promise" lines.

**Radius & shadow**
- Cards `14px` (`--radius` is `12px`; cards in these screens use `14px`, big panels `16–20px`, pills `999px`).
- Card border: `1px solid var(--line)`.
- Lift shadow on hover: `0 14–16px 34px rgba(58,54,49,.08–.16)`.

**Motion** (reuse `globals.css` keyframes where possible: `page-rise`, `motion-lift`, `soft-pulse`)
- Card entrance: `page-rise` .48s `cubic-bezier(.22,1,.36,1)`, staggered.
- Hover lift: translateY(-3px) + shadow, .22s ease.
- Respect `prefers-reduced-motion` (already handled globally).

---

## Screens / Views

### 1. Living Canvas (`/canvas`)

**Purpose:** A calm doorway. The couple picks one creative room to focus on; everything they make flows back into one shared wedding world.

**Layout:** Full-height column on `radial-gradient(120% 70% at 50% 0%, #FBF6EC, #F7F4EE 52%, #F2ECE0)`.
- **Header** (56–60px): "The Missing Peace" wordmark (`.voice`, links to Peace Center) · divider · project name ("Maya & Julian · June 2027") + "THE LIVING CANVAS" eyebrow. Right: a Peace readiness pill (sage) linking to `/peace-center`, and an overlapping presence stack (M / J / A avatars — clay / slate / sage circles, `-8px` overlap).
- **Hero** (centered, max 820px): eyebrow "WHERE FOREVER TAKES SHAPE" (gold, letter-spacing 3.6px) · `.voice` headline `clamp(34–58px)` "Build the world *your love* will walk into." (the "your love" in italic gold) · a rule–italic Compass sentence–rule row pulling `compass.short` · sub "Choose a room to shape — everything you make flows back into one wedding world."
- **Room cards** (grid: 3 cols ≥1000px, 2 cols ≥760px, 1 col below; gap 22px; max 1120px): three `.lc-room` cards.
- **Dream Drawer** (bottom strip, `--cream`/`#FBF8F2` on `--line` top border): "Dream Drawer — the sparks waiting to become real" + "Open the full Dream →" (`/dream`). A horizontal scroll of ~6 inspiration chips; each has a colored tag dot, an uppercase tag, a `.voice` title, and "Open in [room] →"; clicking routes to the mapped studio.

**Room card** (`.lc-room`, `--pearl`, `1px --line`, radius 20px, `page-rise` entrance staggered by index):
- **Motif band** (height 158px): a small CSS illustration themed per room, tinted from the couple's live palette —
  - *Feast*: a green table strip along the bottom, a centered plate (floats via `lc-float`, centered with `left:calc(50% - 23px)`, sits ON the table), two candles spread wide at 26% / 74% with a soft glow + flicker.
  - *Atmosphere*: five vertical palette stripes (the 5 palette colors) + a glowing "moon" disc top-right that drifts.
  - *Atelier*: a stylized dressed figure (skin circle head, a `clip-path` gown/suit body in the secondary color, a vertical accent placket) that drifts.
- **Body** (padding 20–22px): eyebrow kicker (gold) · `.voice` 28px room name · serif-italic promise line (see copy) · a progress **ring** (conic-gradient, sage when ≥66% else gold) with a percentage + status label + sub · an "Enter" pill (`--clay` bg, `#BC7459`, white text; on hover deepens to `#8A4A33` and widens its gap).

**Room copy (exact):**
- Feast Studio — kicker "THE TABLE"; promise *"Build a meal every guest can enter, understand, and enjoy."*; status e.g. "5 of 9 moments shaped" / "welcome drink → sendoff"; CTA "Enter the Feast".
- Atmosphere Lab — kicker "THE FEELING"; promise *"Design the feeling before anyone says a word."*; status "Palette aligned" / "4 feeling words chosen"; CTA "Enter the Lab".
- The Atelier — kicker "THE STORY WORN"; promise *"Design the story your love will wear."*; status "1 of 3 looks blessed" / "composed against the palette"; CTA "Enter the Atelier".

**Entrance animation (key interaction):** Clicking a card does **not** navigate immediately. It mounts a full-screen overlay (z 1000): the room's themed wash color fills the screen (`fadein` .3s), a radial burst blooms from center (`scale .15 → 11` over 1s, `cubic-bezier(.55,0,.28,1)`), and "STEPPING INTO / [Room Name] ✦" fades up in Cormorant on the wash. After ~1050ms it routes to the room. In Next.js: intercept the click, render the overlay, then `router.push()` after the timeout (or use a route transition / `next-view-transitions`). Per-room wash: Feast `#8A4A33`, Atmosphere `#566049`, Atelier `#7C5470` (burst is a radial-gradient of a tint→base of that color; base bg is the color shaded 35%).

**Progress math (live):** Feast pct = courses with ≥1 dish / total (min 9). Atmosphere pct = 100 if palette aligned (`wedding.palette === board.palette.name`) else 55. Atelier pct = blessed looks / total (a look is blessed when all approvers approve). Rings turn sage at ≥66%.

---

### 2. Feast Studio (`/canvas/feast`)

**Purpose:** Compose the wedding meal as a sequence of *moments*, each honoring dietary/cultural needs — "food every guest can enter."

**Layout:** App shell (global header + contextual bar + 3-zone workspace + Peace Panel), matching the other studios. Left: the course/moment timeline (welcome pour → grazing → first course → main → sweet → late-night → tea & sendoff). Center: the selected moment — its scene line, service style, staffing, rentals, timing, and its dishes. Right: a "Peace Panel" with dietary coverage (which guest types are safely served) and next actions.

**Data:** reads/writes `board.food` (`courses[]` each with `dishes[]`; every dish carries `story`, `plate`, `restrictions[]`, `compliance`, `execution`, `blessed`, `cost`; plus top-level `restrictions[]`, `guestCoverage[]`, `moods`, `bar`, `presentation[]`, `cocktails[]`). See the seed in `wedding-state.js` for the exact Maya & Julian content and the full dietary matrix (Vegetarian, Vegan, Gluten free, Nut allergy, Halal, Zabiha, Kosher, Alcohol free, Kid friendly).

> **Note:** The prototype `Feast Studio.html` was intended to eventually merge with the Board's food section. In the Next.js app it *is* the food surface — there is no separate board food view.

---

### 3. Atmosphere Lab (`/canvas/atmosphere`)

**Purpose:** An atmosphere control room (not a color picker). Choose the *feeling*, shape palette *roles*, set light direction, and watch a live "day preview" of the whole wedding recolor.

**Layout:** App shell. **Contextual bar:** studio name · palette name · mood summary · layout tabs ("All surfaces" / "Focus") · a **"Ripple through the world · NN%"** primary button. **Compact header:** eyebrow "TURN THE COMPASS INTO A FEELING" · `.voice` "Design the feeling before anyone says a word." · an editable **Intention** line (serif italic) · setup chips (Palette / Season / Light / Feeling) · and a "palette at a glance" card (5 swatches + Feeling/Light/Alignment rows).

**Workspace (3 zones):**
- **Left — Palette console:** feeling-word chips ("What should the world feel like?" — 20 words, multi-select); five palette **role tokens** (Primary/Secondary/Accent/Neutral/Ink) as tall swatches; a role detail card (selected role's mood meaning + "appears in …"); a 12-tone recolor grid; **Light direction** (Sunrise / Golden hour / Candlelight / Starlight, each with a photography note); **Palette moments** presets (Sage & Clay / Golden Harvest / Dusk Garden).
- **Center — Living day preview:** in "All surfaces" a responsive grid of **10 surface cards**, each a small CSS illustration that recolors from the palette: Invitation, Wedding website, Tablescape, Florals, Wedding cake, Menu card, Ceremony setting, Reception lighting, Attire, Peace Notes cover. Each card shows an on-palette / intentionally-off-palette dot. Below the grid: a **Palette Journey** timeline (Getting ready → Ceremony → Cocktail → Reception → Afterparty, each a mini 5-chip palette you can apply). "Focus" mode shows one surface large with a thumbnail rail + an "Override this surface intentionally" toggle.
- **Right — Peace Panel:** a **World alignment** ring (conic, sage when rippled & no overrides) + label; an overrides note when surfaces are intentionally off-palette; **Palette intelligence** bullets (contrast/legibility/lighting advice); a dark **Next action** card; Light & photography note; and "This palette ripples into …" chips.

**"Ripple through the world":** applies the palette across every surface and marks it aligned — in the app this persists `board.palette` and flags `wedding.palette = board.palette.name`, then surfaces a toast listing the modules it touched (Invitation & website, Tablescape & florals, Menu & signage, Attire palette, Peace Notes cover).

**Data:** `board.palette` (`colors[]`, `roles[]`, `atmosphere[]`, `journey[]`), `wedding.light`, `wedding.season`.

---

### 4. The Atelier (`/canvas/atelier`)

**Purpose:** A fashion studio to compose each person's look against the palette, preview it in the day's contexts, and gather approvals.

**Layout:** App shell. **Contextual bar:** studio name · dress code · look count · layout tabs ("Studio" / "Focus") · a **"Guest dress code · NN%"** button (opens the dress-code modal). 

**Workspace (3 zones):**
- **Left — "Who are we dressing?":** a wardrobe list; each row is a person with a tiny stylized figure (recolored to their look), name, garment, and an approval-status dot. Below: "Add someone" quick chips (Parent, Flower girl, Ring bearer, Reception look, Afterparty look, Cultural ceremony look).
- **Center — Look composer:** a large figure stage (the figure reshapes as options change — silhouette via `clip-path`, color/accent from the palette, a veil overlay when chosen) with an editable look title + status pill + a "Bless this look" button; beside it a guided composer of chip groups: **Garment** (culturally broad — Gown, Suit, Tuxedo, Jumpsuit, Two-piece, Sherwani, Lehenga, Kaftan, Cape dress, Cultural attire), **Silhouette**, **Fabric**, **Color** (palette-linked + Ivory), **Accent**, **Accessories** (multi), **Formality**, **Modesty** (As designed, Sleeves, Higher neckline, Full length, Hijab-friendly, Covered shoulders), **Movement**. Below the composer: **"See it in the day"** — horizontal context previews (Down the aisle, Portraits, Reception lighting, On the dance floor, Beside your partner, Against the palette), each a scene-tinted card showing the figure(s).
- **Right — Peace Panel:** **Couple Harmony** (both partner figures side-by-side with a verdict badge + note about formality/tonal balance); **Approvals** for the active look — **the approver rows are editable project roles** (rename "Maya/Julian/Aria" to the couple's own labels; each has a "Loves it / Pending" toggle); **Wedding Party Harmony** (same-tone / different-silhouette note); a dark **Next action** card.

**Dress-code modal:** generated guest dress code with selectable formality (Garden formal, Cocktail, Black-tie optional, Festive casual, Beach formal, Cultural formal), the guest-facing copy for website/invitation, and the rules/sensitivities list. Ripples into website, invitation & guest FAQ.

**Data:** `board.attire` (`dressCode`, `rules[]`, `looks[]` — each look: `party`/person, `title`, `color`, `accent`, `notes`, `details{}`, `approvals{}`, `status`). **Important:** the prototype's hardcoded approver names (Maya/Julian/Aria) must become **editable roles** tied to the workspace members, not literals.

---

### 5. Money Map (`/budget` → `MoneyMapWorkspace.tsx`)

**Purpose:** A living budget where every number is editable and the whole system reconciles to it (vendors, decisions, guests all link back).

**Layout:** App shell. Title "Money Map" + subtitle. **Summary band card:** Funds gathered − Planned = Room left / Over budget (each a `.voice` number), a status pill (sage "On track ✦" / clay "Over by $X"), a stacked **allocation bar** (each category a colored segment + an "unallocated" remainder), and a "$X paid · $Y still scheduled · Linked: N vendors · S/T decisions · G guests" line.

**Two-column body:**
- **Left — "Where it goes":** each budget category is a row with a **protect** toggle (◇/◆), name, an editable `$ planned` number input, and a two-layer progress bar (committed = `#DFD2B4`, paid = `--sage`) with a status line ("$X paid of $Y" / "$X committed" / "planned only") and a linked vendor tag (✦ vendor name). "Add a category…" input + button. "Planned total" footer.
- **Right column (3 cards):**
  - **Who's giving** — editable contributor rows (name + `$ pledged` + remove), "+ Add contributor", "Total gathered".
  - **Protect & trim** — a note explaining the Compass holds catering/photo/music sacred; protected-category chips; and, when over budget, a clay **"Auto-trim $X to fit ✦"** button that trims *unprotected* categories proportionally; when under, a sage "Within your funds" note.
  - **Payment milestones** — each with a paid toggle (○/✓), label, meta ("Paid" / "Due [date]" / vendor), and amount (sage when paid). Footer "$X paid · $Y still to go".

**Data & logic:** `budget` slice (`contributors[]`, `categories[]`, `payments[]`); vendors link via `categoryId`. The repo already has the real engine — **reuse `src/lib/engine/money-map.ts` and `src/lib/money-map/language.ts`** rather than reimplementing the math; the prototype's `renderVals()` mirrors that logic (funds/planned/remaining/over, proportional auto-trim of unprotected categories, paid vs scheduled). The existing `MoneyMapWorkspace.tsx` is the file to update.

---

### 6. Homepage (`Homepage.html`) — public entry / Dream Walk door

**Purpose:** Marketing front that reels a potential user in and lets them "step through the door" into the Dream Walk. Sales/monetization sneak-peek.

**Key content & flow (in order):**
- A hero with the same "Build the world your love will walk into." voice.
- **Chapter One** — a love-letter section.
- **Wedding Compass** — a live Dream-Clouds sky matching the Dream Walk (same compass + clouds component, same functionality/experience).
- **One Engine · Four Layers** — Dream / Compass / Engine / World explainer cards (placed *before* the compass demo).
- A **Weaver** closing line + centered **"step through the door →"** CTA (keep the orange/clay color and the existing button font; this replaced "begin the dream walk").
- A **"who's arriving"** entrance where the visitor self-identifies — the options are **"arriving as a dreamer"** (single embedded entrance; the second sign-in was removed). "Open the full Dream →" scrolls up to this chooser, then "Step through the door" runs a **door-opening animation** into the Dream Walk (`Dream Walk.html` → the app's `/onboarding` / `DreamWalkOnboarding.tsx`).
- Fonts were resized across the homepage to match the app's Inter/Cormorant system.

**Note:** The prototype showcases the fixed demo couple (Maya, Julian, Aria). In the product, presence/roles come from the workspace, and the visitor arrives as a *dreamer*.

---

## Interactions & Behavior (cross-cutting)

- **App shell** (Feast/Atmosphere/Atelier): fixed global header (wordmark → Peace Center, project name + studio eyebrow, "Saved" pill, presence avatars) · a contextual bar (studio name + summary + layout tabs + primary ripple/action) · a 3-zone workspace that collapses responsively (≥1240px shows the right Peace Panel inline; below, it becomes an overlay opened by a floating "Insights/Harmony" FAB) · a mobile bottom nav (3 tabs) under 860px.
- **Live state:** every studio subscribes to shared state and rerenders on change; writes persist immediately (prototype: `localStorage`; app: server action → Supabase → revalidate). Cross-studio ripples: a palette change in Atmosphere shows up on the Atelier's palette-linked color chips and the Living Canvas motifs; blessing a look updates the guest dress code; budget reconciles vendors/decisions/guests.
- **Toasts:** "Ripple through the world" (Atmosphere) and "Bless the look" (Atelier) surface a bottom-center toast listing the modules touched, with a Dismiss.
- **Reduced motion:** honored globally (see `globals.css`).

## State Management

Use the app's existing pattern (server components fetch, client `*Studio`/`*Workspace` components hold interaction state, server actions mutate). The **shape** to support is fully specified in `wedding-state.js` (included) and mirrored in `src/lib/types.ts`. Key slices: `wedding`, `compass`, `dreams`, `board.{food,palette,attire,inspirations}`, `budget`, `vendors`, `decisions`, `guests`, `website`, `documents`, `notes`. Derived selectors already exist: `peaceScore()` and `budget()` in the engine — reuse them for the Living Canvas rings and Money Map summary.

## Assets

No external image assets — every illustration (room motifs, wedding-surface previews, figures, budget bars) is **CSS/geometry drawn from the palette**, so it recolors live. Fonts are Google Fonts **Inter** + **Cormorant Garamond** (already loaded app-wide). Icons are simple glyphs/Unicode in the prototype; substitute the codebase's existing icon set (the nav already references named icons).

## Files (in this bundle)

- `Living Canvas.html` — the hub + entrance animation
- `Feast Studio.html` — menu / hospitality studio
- `Atmosphere Lab.html` — palette & mood control room + day preview
- `Atelier.html` — fashion studio + approvals
- `Money Map.html` — living budget (maps to `/budget`)
- `Homepage.html` — public entry / Dream Walk door
- `Dream Walk.html` — the onboarding the homepage door opens into (reference for the compass + clouds experience)
- `wedding-state.js` — **canonical data shape + seed content** (persistence is prototype-only; use Supabase in the app)
- `support.js`, `mobile.js` — prototype runtime & mobile-nav shim, included **for reference only — do not port**

## What NOT to carry over

- The `<x-dc>` wrapper, `support.js` runtime, `data-dc-script` classes, and `renderVals()` — prototype scaffolding.
- `localStorage` persistence — use the app's server actions + Supabase.
- Hardcoded demo people (Maya/Julian/Aria) as literals — wire to workspace members; approver rows in the Atelier are **editable roles**.
- Inline `<style>`/CSS-var block duplicated in each file — the app already defines these tokens in `globals.css`.
