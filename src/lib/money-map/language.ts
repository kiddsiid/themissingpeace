// Money Map — language & guidance layer (Claude-owned). Turns the numbers Codex's estimate
// engine produces into calm, human guidance. No shaming, no dramatic alerts, ranges not
// exact figures, and the Wedding Compass is always the thing being protected.
//
// The math here (likelyRange / budgetFit thresholds) is a reasonable DEFAULT so this is usable
// and testable today; Codex may replace the computation with the benchmark-driven engine. The
// *words* are the point — pass in whatever numbers you compute and the narratives adapt.

export type WeddingType = 'local' | 'backyard' | 'restaurant' | 'venue' | 'domestic_destination' | 'international_destination' | 'multi_day';
export type BudgetFit = 'peaceful' | 'close' | 'stretched' | 'at_risk';
export interface Range { low: number; high: number; }

export interface MoneyMapInput {
  locationLabel: string;      // "Indianapolis" / "New Jersey"
  benchmarkAvg: number;       // local average cost from cost_benchmarks
  guestCount: number;
  targetBudget: number;
  weddingType?: WeddingType;
  compassPriorities?: string[]; // ranked Dream priorities, e.g. ['food','photography','guest experience']
  nationalGuestAvg?: number;    // default 117 (The Knot 2026)
}

const TYPE_MULT: Record<WeddingType, number> = {
  local: 1, backyard: 0.85, restaurant: 0.9, venue: 1,
  domestic_destination: 1.15, international_destination: 1.3, multi_day: 1.35,
};

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const round500 = (n: number) => Math.round(n / 500) * 500;

// Location average, nudged by how far guest count sits from the national average and by type.
export function adjustedAverage(input: MoneyMapInput): number {
  const natl = input.nationalGuestAvg ?? 117;
  const guestFactor = 0.6 + 0.4 * (input.guestCount / natl); // ~60% fixed, ~40% guest-driven
  const typeMult = TYPE_MULT[input.weddingType ?? 'local'] ?? 1;
  return input.benchmarkAvg * guestFactor * typeMult;
}

// A likely RANGE, never a single number.
export function likelyRange(input: MoneyMapInput): Range {
  const a = adjustedAverage(input);
  return { low: round500(a * 0.8), high: round500(a * 1.4) };
}

export function budgetFit(targetBudget: number, range: Range): BudgetFit {
  if (targetBudget >= range.high) return 'peaceful';
  if (targetBudget >= range.low) return 'close';
  if (targetBudget >= range.low * 0.8) return 'stretched';
  return 'at_risk';
}

export function fitCopy(fit: BudgetFit): { headline: string; body: string } {
  switch (fit) {
    case 'peaceful':
      return { headline: 'Peaceful', body: 'Your budget gives you room to breathe for a wedding like this here. You get to choose where the extra goes — not scramble to cover the basics.' };
    case 'close':
      return { headline: 'Close', body: 'Your budget is right around what weddings like yours cost in this area. It’s workable — a few thoughtful choices will keep it feeling calm rather than tight.' };
    case 'stretched':
      return { headline: 'Stretched', body: 'This is doable, but it’ll ask for a few gentle tradeoffs. The good news: if we protect what your Dream cares about most, the rest can flex.' };
    case 'at_risk':
      return { headline: 'Worth a rethink', body: 'Right now the budget and the vision are pulling in different directions. Nothing’s wrong — it just means an early, honest choice (guest count, location, or scope) will save a lot of stress later.' };
  }
}

// The main estimate paragraph — what the number means, what drives it, what to decide first.
export function estimateNarrative(input: MoneyMapInput, range?: Range): string {
  const r = range ?? likelyRange(input);
  const fit = budgetFit(input.targetBudget, r);
  const natl = input.nationalGuestAvg ?? 117;
  const parts: string[] = [];

  parts.push(`In ${input.locationLabel}, weddings around your size are likely to land between ${money(r.low)} and ${money(r.high)} — the local average is near ${money(input.benchmarkAvg)}. Your target of ${money(input.targetBudget)} reads as ${fitCopy(fit).headline.toLowerCase()}.`);

  if (input.guestCount > natl * 1.15) {
    parts.push(`Your guest count (${input.guestCount}) is above the national average of ${natl}, and guests are the biggest cost driver — they pull on catering, bar, rentals, seating, invitations, and staffing all at once.`);
  } else if (input.guestCount < natl * 0.7) {
    parts.push(`Your smaller guest count (${input.guestCount}) works in your favor — it eases catering, bar, rentals, and seating, and often opens up more intimate venues.`);
  }

  if (input.weddingType && input.weddingType !== 'local' && input.weddingType !== 'venue') {
    parts.push(`Because this is a ${input.weddingType.replace(/_/g, ' ')} celebration, expect the range to sit a little higher than a hometown wedding — travel, logistics, and multi-part days add up.`);
  }

  parts.push(compassLine(input.compassPriorities));
  parts.push(`These are planning estimates from market data (The Knot 2026), not quotes — they’ll sharpen into a real plan as vendor numbers and contracts come in.`);
  return parts.filter(Boolean).join(' ');
}

function compassLine(priorities?: string[]): string {
  if (!priorities || priorities.length === 0) return 'As you set category amounts, keep protecting the parts of the day that matter most to you.';
  const top = priorities.slice(0, 3).join(', ');
  return `Your Dream leans on ${top}, so Money Map will protect those first — if something has to give, it should come from the areas you cared about least, not these.`;
}

// Calm note when guest count changes.
export function guestCountPressure(from: number, to: number): string {
  if (to === from) return 'Guest count is unchanged.';
  const up = to > from;
  const affected = 'catering, bar, rentals, seating, invitations, favors, and transportation';
  return up
    ? `Going from ${from} to ${to} guests adds gentle pressure across ${affected}. It’s worth it if these people matter — just know it’s the change most likely to move the total, so we’ll watch it together.`
    : `Trimming from ${from} to ${to} guests eases ${affected}, and usually frees up room to strengthen the parts of the day you care about most.`;
}

// "What can this budget hold?" — a practical, honest interpretation.
export function whatCanThisBudgetHold(input: MoneyMapInput): string {
  const r = likelyRange(input);
  const fit = budgetFit(input.targetBudget, r);
  const protect = (input.compassPriorities ?? []).slice(0, 2).join(' and ') || 'the moments you care about most';
  if (fit === 'peaceful' || fit === 'close') {
    return `In ${input.locationLabel}, ${money(input.targetBudget)} can likely support a full, warm wedding at ${input.guestCount} guests — with real strength in ${protect}. You’ll have room to make a couple of areas feel special rather than spreading thin.`;
  }
  if (fit === 'stretched') {
    return `In ${input.locationLabel}, ${money(input.targetBudget)} can hold a beautiful wedding at ${input.guestCount} guests if you go strong in ${protect} and keep the rest simple — think fewer premium rentals and a lighter floral build, not a smaller heart.`;
  }
  return `In ${input.locationLabel} at ${input.guestCount} guests, ${money(input.targetBudget)} is tight for everything at once. The kindest move is to pick a lane early: a smaller guest count with full service, or a larger celebration with simpler design. Either can be lovely — Money Map will protect ${protect} whichever you choose.`;
}

// Tradeoffs that protect the Dream — trim from flexible areas, never the priorities.
const FLEXIBLE_FIRST = ['decor', 'florals', 'favors', 'premium rentals', 'stationery', 'entertainment upgrades'];
export function tradeoffSuggestions(priorities?: string[]): { protect: string[]; trimFirst: string[]; sentence: string } {
  const protect = (priorities ?? []).slice(0, 3);
  const trimFirst = FLEXIBLE_FIRST.filter((c) => !protect.some((p) => c.includes(p.toLowerCase())));
  const protectText = protect.length ? protect.join(', ') : 'your top priorities';
  return {
    protect,
    trimFirst,
    sentence: `To protect ${protectText}, the easiest places to soften first are ${trimFirst.slice(0, 3).join(', ')} — small trims there tend to go unnoticed on the day, while cutting your priorities would be felt.`,
  };
}

// Next best financial actions — calm, concrete, 3 at a time.
export function nextBestFinancialActions(input: MoneyMapInput, fit?: BudgetFit): string[] {
  const f = fit ?? budgetFit(input.targetBudget, likelyRange(input));
  const base = [
    'Set a firm guest-count range — it moves the budget more than any single vendor.',
    'Turn one estimate into a real number: get two quotes for your most-protected category.',
    'Name the one area you’d never want to cut — Money Map will guard it.',
  ];
  if (f === 'stretched' || f === 'at_risk') {
    base.unshift('Before adding vendors, decide the single tradeoff that keeps the Dream intact (guest count, location, or scope).');
    base.pop();
  }
  return base.slice(0, 3);
}

export const MONEY_MAP_TONE = {
  do: ['use ranges, not exact numbers', 'stay calm and advisory', 'protect the Wedding Compass first', 'explain what drives the estimate', 'name the first decision to make'],
  dont: ['shame or use dramatic red alerts', 'promise precision', 'treat money as separate from meaning', 'punish the couple for wanting more people'],
};
