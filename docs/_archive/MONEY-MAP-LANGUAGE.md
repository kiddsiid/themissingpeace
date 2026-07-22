# Money Map — voice & guidance guide (Claude-owned)

Money Map is the financial planning system inside The Missing Peace. It must feel like a calm
planning space, **not accounting software**. Its deeper job: help couples make *peaceful* financial
decisions and keep the money protecting the **Dream** (the Wedding Compass).

Consumed by Codex's Money Map engine/UI:
- `src/lib/money-map/benchmarks.json` — cost benchmark seed (The Knot 2026), + wedding-type modifiers.
- `src/lib/money-map/language.ts` — deterministic guidance generators (below).
- `src/lib/money-map/peacekeeper-money-map.txt` — AI narration prompt for richer, dynamic copy.

## Voice
- **Calm, advisory, human.** Ranges, not exact numbers. "Likely range," "market average," "your target."
- **No shaming, no red alarms.** Never "you can't afford this." Guest count is a *choice to weigh*, not a mistake.
- **Meaning first.** Always tie money back to the Compass; protect priorities, trim from what they cared about least.
- **Transparent.** Show the benchmark source + year; say estimates sharpen into a plan as quotes/contracts arrive.
- **Honest.** "What can this budget hold?" gives a real interpretation, not a generic yes.

## The four budget-fit readings
| Reading | Meaning | Headline copy |
|---|---|---|
| **peaceful** | target ≥ top of local range | "Your budget gives you room to breathe." |
| **close** | target within the local range | "Right around what weddings like yours cost here." |
| **stretched** | target just below range | "Doable, with a few gentle tradeoffs." |
| **at_risk** | target well below range / guest pressure high | "Worth an early, honest choice — not a red alert." |

## The estimate, in layers (what `language.ts` explains)
1. **Location** benchmark is the starting point (with source).
2. **Guest count** adjusts it (the biggest driver; compared to the national avg of 117).
3. **Wedding type** adjusts it (destination/multi-day trend higher — labeled as heuristic).
4. **Dream priorities** decide what to protect when tradeoffs appear.
Result is always a **range**, with a plain-language reason for what's driving it.

## Worked example (the one from the brief)
Input: Indianapolis, 150 guests, $25,000 target, Dream = food + photography + guest experience.
Money Map should say, calmly:
> "In Indianapolis, weddings around your size are likely to land between ~$22,000 and ~$38,000 — the
> local average is near $25,000. Your target of $25,000 reads as *stretched*. Your guest count (150) is
> above the national average of 117, and guests are the biggest cost driver — they pull on catering,
> bar, rentals, seating, invitations, and staffing at once. Your Dream leans on food, photography, and
> guest experience, so Money Map will protect those first; if something gives, it should come from
> florals, decor, or premium rentals. These are planning estimates from market data (The Knot 2026),
> not quotes — they'll sharpen as vendor numbers come in."
Then: first decisions → "set a firm guest-count range," "get two catering quotes," "name the one area
you'd never cut."

## Peace Engine triggers (when to re-narrate)
Re-run Money Map guidance whenever location, budget, guest count, wedding type, a vendor quote, a
category amount, a contribution, a payment milestone, or a major decision changes — then update the
fit reading and surface the next best action.

## Estimated → quoted → committed → paid
Language should celebrate the progression: an **estimate** is an assumption; a **quote** is a vendor
number; **committed** is a selected vendor / signed contract; **paid** is money out. Reflect how much
of the wedding is still flexible vs. locked in.
