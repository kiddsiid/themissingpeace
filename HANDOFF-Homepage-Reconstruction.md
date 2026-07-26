# The Missing Peace — Homepage Reconstruction · Handoff Notes

**Date:** 2026-07-22
**File replaced:** `prototype/Homepage.html` (self-contained HTML/CSS/JS, ~65 KB)
**Backup of the previous page:** `prototype/Homepage.pre-reconstruct-2026-07-22.html` (the old 86 KB version, untouched)
**Fonts:** Cormorant Garamond + Inter (kept, loaded from Google Fonts in `<head>`)

This is a from-scratch overhaul, not a patch of the bundled export. There is no bundler wrapper, no
`{{ template }}` placeholders, and no preview-runtime dependency — the page renders on its own from
`file://` or any static host.

---

## 1. What was completed

**Removed** (as requested)
- "WEDDING PLANNING ENGINE" tagline in the top-left.
- "Free to dream ✦" in the top-right.
- "Free to dream · no sign-in" as a poetic line.
- "Step through the door", "Open the full Dream", "Where forever begins", "Your day. Your people.
  Your peace.", "Every choice, held in the right hand", and the other flagged phrases.

**The door became a threshold**
- A thin gold architectural arch suspended in the mist, warm moonlight filling the opening, a light
  path leading up to it, and a hover state that brightens the path + arch and turns the cursor into a
  small point of light. It is a real `<button>` with a keyboard focus state.
- Clicking **"Begin with the feeling →"** or the arch runs a ~1.6 s transition: hero copy dissolves,
  two translucent atmospheric layers part, moonlight blooms, and the page eases forward into the
  Dream Walk. No zoom, no white flash, page is never locked.

**Seven sections, one continuous world**
1. **Hero / opening landscape** — dusk sky, moon, drifting clouds, threshold, the new hero copy, and
   a secondary "I'm planning as…" role selector (couple / planner / guest) that swaps one supporting
   line without redirecting.
2. **The Dream Walk** — path with three markers: *Notice the feeling · Name what matters · Carry it
   into the day*. Continues the hero's sky and moon; dusk fades into the cream/paper world with no
   hard section break.
3. **Chapter One** — kept quiet and substantially unchanged: paper card, fine gold inner border,
   Cormorant headline, the exact copy, "FROM THE MISSING PEACE" / *for R.*
4. **One engine · Four layers** — Dream / Compass / Engine / World, in plain language.
5. **The Wedding Compass** — the interactive centerpiece (details below).
6. **The practical engine** — three Dream → Becomes translations that make the product concrete.
7. **The Weaver** — a quiet vow card with a gold thread, then the final CTA that replays the Dream Walk.

**Accessibility & performance**
- Semantic headings, real buttons, visible focus rings, `aria-live` on the Compass readout, descriptive
  `aria-label`s on every cloud, arrow-key + Enter cloud control, full `prefers-reduced-motion` path
  (shorter transitions, no parallax, page never locks), three parallax depth-layers only (not per-object).

**Verification (headless Chromium, desktop + mobile + reduced-motion)**
- 0 JavaScript errors in every mode. (The only console line in the sandbox was Google Fonts being
  network-blocked here; it loads normally on a real machine.)
- Drag with mouse **and** touch updates the compass live; keyboard Enter pulls a cloud in and it becomes
  "Guiding the compass".
- Threshold transition dissolves and scrolls without locking; reduced-motion falls back to a plain scroll.
- Mobile lays out as a loose vertical constellation (no overlapping cloud text), board ~960 px tall.

---

## 2. Notable benchmarks to deep-dive & adjust

Everything below is a named constant or a small block, so you can tune the feel without unpicking logic.
Line numbers are approximate; search the quoted token to jump straight there.

### A. Motion timings
| What | Where (search token) | Current value |
|---|---|---|
| Threshold cross duration | `crossfade.classList.remove('run')` timeout | **1650 ms** (scroll starts at **620 ms**) |
| Crossfade leaf/bloom keyframes | `@keyframes partL`, `partR`, `bloom` | **1.6 s** |
| Reveal-on-scroll trigger point | `vh*0.90` in `initReveal` | reveals when top passes **90%** of viewport |
| Moon "breathing" | `@keyframes moonBreath` | **8 s**, scale 1 → 1.035 |
| Cloud drift | `buildClouds()` `.animate(... duration:(26000+i*5000))` | **26–46 s** per cloud |
| Star twinkle | `@keyframes twinkle` | **6 s** |

> Feel is deliberately slow. If it reads *too* slow, cut the threshold timeout to ~1300 ms and the
> keyframes to ~1.3 s together (keep them in sync).

### B. Wedding Compass — the core logic (all in the `CLOUDS` / geometry block)
- **Single source of truth:** the `CLOUDS` array. Each item is
  `{ id, type, label, phrase, color, x, y }`. `x`/`y` are pixel offsets from the moon at desktop scale.
  Change a cloud's meaning by editing `label` (the big text), `type` (the small caps), and `phrase`
  (what it contributes to the live sentence). Change its start position with `x`/`y`.
- **Distance → status thresholds:** the `radii()` function returns
  `inner: base*0.22`, `mid: base*0.40`, `max: base*0.62` (where `base = min(board width, height)`).
  - inside `inner` → **Held close** (and the single closest one → **Guiding the compass**)
  - inside `mid` → **Rising**
  - beyond → **In the constellation**
  - **Tune these three multipliers** to make clouds "lock in" sooner or later.
- **Priority formula:** `priority = 1 - distance / max` in `updatePriorities()`. Closer = higher.
- **Live sentence system:** `composeSentence()` + `PAIR_TEMPLATES` + `DEFAULT_SENTENCE`.
  - `DEFAULT_SENTENCE` shows when nothing is held close.
  - `PAIR_TEMPLATES` holds hand-written editorial sentences for three notable pairings
    (`family+table`, `atmosphere+feeling`, `boundary+memory`). Add more keys as `"idA+idB"` (sorted).
  - Otherwise it composes grammatically: *"A celebration built around {lead}, with {a}, and {b}."*
    No blind comma-joining — `joinPhrases()` handles the *and* / Oxford comma.
- **Moon reading + lighting cue:** `moonReadout()` maps the lead cloud to a short line and picks a cue
  (`By candlelight` / `Well past midnight` / `In quiet light` / `At golden hour`). Edit the `map` object
  and the cue `if` chain to change these.
- **Moon warmth:** in `refresh()`, `warmth = min(1, closeCount/3)` drives the glow size/opacity. Raise
  the divisor to make the moon warm up more gradually.

### C. Mobile layout
- **Constellation positions:** the `MOBILE_POS` object — each cloud as `[xFraction, yFraction]` of the
  board. Nudge these to re-space the vertical constellation.
- **Breakpoint for mobile board logic:** `isMobileBoard()` → board width **< 620 px**.
- **Board height / moon height on mobile:** the `@media(max-width:760px)` block — board `min-height:960px`,
  moon `top:15%`. Cloud width is pinned to 150 px (≥ the 140 px minimum you asked for).

### D. Palette (all CSS custom properties at the top, `:root`)
- **Editorial/paper:** `--cream #F5EEDF`, `--paper`, `--paper-2`, `--ink #332F29`, `--gold #B8924A`.
- **Dusk/atmosphere:** `--dusk-top #20242e`, `--dusk-mid #3a3a4d`, `--dusk-low #6d6274`,
  `--dusk-glow #c8a98a`, `--dusk-cream #e7dcc7`, `--moonlight #f4e6c9`.
- **Cloud colors:** the `COLORS` object in JS (`sage/blush/gold/sky/clay/lav/cream`), each with
  `hi` (highlight), `lo` (shadow), `type` (label color). This is what gives each cloud its dimensional
  shading; change a cloud's `color` field in `CLOUDS` to reassign.

### E. Copy hotspots (if you want to keep tuning language)
- Hero: search `Where the day begins`, `Start with how you want the day to feel`.
- Dream Walk markers: `Notice the feeling`, `Name what matters`, `Carry it into the day`.
- Compass helper: `Bring the clouds closer. The day will show you what matters most.`
- Practical engine translations: search `Family at the center`, `Ease and calm`, `Soft natural beauty`.
- Weaver: `When the feeling is clear, the words come easier.`

---

## 3. Known trade-offs / things to eyeball on your screen

- **Moon behind the Dream Walk intro paragraph.** The single fixed moon is the atmosphere's anchor, so
  as you scroll the intro paragraph passes over it. I added protective text-shadows and it stays
  readable, but it's a deliberate dreamy overlap — if you'd rather it never touch text, increase the
  Dream Walk top padding (`.dreamwalk{ padding:22vh ... }`) or lower the moon's opacity there.
- **Clouds are soft rounded "pods", not literal cartoon clouds** — chosen to read as atmospheric forms
  per the brief. If you want a more cloud-like silhouette, the shape is one CSS `border-radius` on
  `.dcloud .shape`.
- **Google Fonts are loaded from the CDN.** If you want the page fully offline/self-hosted, swap the
  `<link>` for locally hosted `@font-face` files.

## 4. To deploy

Your build pipeline treats `prototype/Homepage.html` as the source and regenerates `.pages-prototype/`
(config + JSON-LD + API inlining). After you've reviewed the page:

```
pnpm run prototype:build     # regenerate .pages-prototype from the new Homepage.html
pnpm run prototype:preview   # local preview at :8788
pnpm run prototype:deploy    # deploy to Cloudflare Pages
```

**One thing to reconcile:** this reconstruction is a pure brand/experience homepage. The previous
`Homepage.html` also carried the conversion funnel (inline 5-question Dream Walk, email capture, Stripe
offer, JSON-LD from `landing-config.json`). Those funnel/analytics hooks are **not** in the new page.
If you want the email capture / founding-offer / JSON-LD back, we can graft them onto this design as a
follow-up — say the word and I'll wire them into the new structure (and re-point the CTAs at
`/dreamwalk` / the workspace).

To roll back at any time: copy `Homepage.pre-reconstruct-2026-07-22.html` over `Homepage.html`.
