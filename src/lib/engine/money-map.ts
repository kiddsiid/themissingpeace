export type BudgetFit = 'peaceful' | 'close' | 'stretched' | 'at risk';

export type WeddingType =
  | 'local'
  | 'venue_based'
  | 'restaurant'
  | 'backyard'
  | 'domestic_destination'
  | 'international_destination'
  | 'multi_day';

export type BenchmarkLevel = 'country' | 'state' | 'region' | 'metro' | 'city';

export interface CostBenchmark {
  locationName: string;
  aliases: string[];
  level: BenchmarkLevel;
  sourceName: string;
  sourceYear: number;
  averageCost: number;
  averageGuestCount?: number;
  costPerGuest?: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  notes: string;
}

export interface MoneyMapInput {
  location?: string | null;
  guestCount?: number | null;
  targetBudget?: number | null;
  weddingType?: string | null;
  budgetConfidence?: string | null;
  dreamPriorities?: string[];
  categoryNames?: string[];
}

export interface CategorySuggestion {
  name: string;
  amount: number;
  share: number;
  compassProtected: boolean;
  reason?: string;
}

export interface MoneyMapEstimate {
  benchmark: CostBenchmark;
  guestCount: number;
  targetBudget: number;
  weddingType: WeddingType;
  adjustedAverage: number;
  likelyLow: number;
  likelyHigh: number;
  midpoint: number;
  budgetGap: number;
  fitRatio: number;
  fit: BudgetFit;
  perGuestTarget: number;
  perGuestMarket: number;
  categorySuggestions: CategorySuggestion[];
  pressurePoints: string[];
  firstDecisions: string[];
  compassAlignment: string[];
  holdSummary: string;
  assumptions: string[];
}

export const COST_BENCHMARKS: CostBenchmark[] = [
  {
    locationName: 'United States',
    aliases: ['united states', 'usa', 'us', 'national', 'national average'],
    level: 'country',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 34200,
    averageGuestCount: 117,
    costPerGuest: 292,
    confidenceLevel: 'medium',
    notes: 'National planning benchmark from the Money Map brief. Use as a starting point until local quote data is available.',
  },
  {
    locationName: 'Indiana',
    aliases: ['indiana', 'in'],
    level: 'state',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 24000,
    averageGuestCount: 117,
    costPerGuest: 205,
    confidenceLevel: 'medium',
    notes: 'State benchmark from the Money Map brief.',
  },
  {
    locationName: 'Indianapolis',
    aliases: ['indianapolis', 'indianapolis in', 'indianapolis indiana'],
    level: 'city',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 25000,
    averageGuestCount: 117,
    costPerGuest: 214,
    confidenceLevel: 'medium',
    notes: 'City benchmark from the Money Map brief.',
  },
  {
    locationName: 'North Carolina',
    aliases: ['north carolina', 'nc'],
    level: 'state',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 29000,
    averageGuestCount: 117,
    costPerGuest: 248,
    confidenceLevel: 'medium',
    notes: 'State benchmark from the Money Map brief.',
  },
  {
    locationName: 'Charlotte',
    aliases: ['charlotte', 'charlotte nc', 'charlotte north carolina'],
    level: 'city',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 32000,
    averageGuestCount: 117,
    costPerGuest: 274,
    confidenceLevel: 'medium',
    notes: 'City benchmark from the Money Map brief.',
  },
  {
    locationName: 'New Jersey',
    aliases: ['new jersey', 'nj'],
    level: 'state',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 57000,
    averageGuestCount: 117,
    costPerGuest: 487,
    confidenceLevel: 'medium',
    notes: 'State benchmark from the Money Map brief.',
  },
  {
    locationName: 'New York',
    aliases: ['new york state', 'new york', 'ny'],
    level: 'state',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 49000,
    averageGuestCount: 117,
    costPerGuest: 419,
    confidenceLevel: 'medium',
    notes: 'State benchmark from the Money Map brief.',
  },
  {
    locationName: 'New York City',
    aliases: ['new york city', 'nyc', 'manhattan', 'brooklyn', 'queens'],
    level: 'city',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 88000,
    averageGuestCount: 117,
    costPerGuest: 752,
    confidenceLevel: 'medium',
    notes: 'Major city benchmark from the Money Map brief.',
  },
  {
    locationName: 'Chicago',
    aliases: ['chicago', 'chicago il', 'chicago illinois'],
    level: 'city',
    sourceName: 'The Knot Real Weddings Study',
    sourceYear: 2026,
    averageCost: 54000,
    averageGuestCount: 117,
    costPerGuest: 462,
    confidenceLevel: 'medium',
    notes: 'Major city benchmark from the Money Map brief.',
  },
];

const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  Venue: 17,
  Catering: 23,
  Bar: 7,
  'Cake & desserts': 2,
  Photography: 9,
  Videography: 4,
  Planner: 5,
  Florals: 5,
  Decor: 3,
  Rentals: 5,
  Entertainment: 5,
  Officiant: 1,
  Attire: 5,
  Alterations: 1,
  'Hair & makeup': 2,
  Stationery: 1.5,
  Signage: 0.8,
  Transportation: 1.6,
  Lodging: 1.4,
  'Guest experience': 2.2,
  'Favors & gifts': 1,
  'Marriage license': 0.3,
  Insurance: 0.5,
  'Tips & gratuities': 2,
  'Emergency buffer': 5,
  Honeymoon: 3,
  'Pre-wedding events': 2,
};

const PRIORITY_RULES = [
  {
    terms: ['food', 'meal', 'menu', 'catering', 'hospitality', 'guest experience'],
    categories: ['Catering', 'Bar', 'Guest experience'],
    reason: 'protected by the Compass around food and hospitality',
  },
  {
    terms: ['photo', 'photography', 'memory', 'documentary'],
    categories: ['Photography', 'Videography'],
    reason: 'protected by the Compass around memory and documentation',
  },
  {
    terms: ['family', 'warmth', 'comfort', 'travel', 'welcome'],
    categories: ['Guest experience', 'Transportation', 'Lodging'],
    reason: 'protected by the Compass around family care',
  },
  {
    terms: ['music', 'dance', 'party', 'atmosphere'],
    categories: ['Entertainment'],
    reason: 'protected by the Compass around atmosphere',
  },
  {
    terms: ['flowers', 'florals', 'decor', 'design', 'beautiful', 'aesthetic'],
    categories: ['Florals', 'Decor', 'Rentals'],
    reason: 'protected by the Compass around visual feeling',
  },
  {
    terms: ['calm', 'peace', 'planner', 'ease', 'support'],
    categories: ['Planner', 'Emergency buffer'],
    reason: 'protected by the Compass around calm planning',
  },
  {
    terms: ['honeymoon', 'travel', 'trip'],
    categories: ['Honeymoon'],
    reason: 'protected by the Compass around the forever trip',
  },
];

function dollars(value: number) {
  return Math.round(value);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeWeddingType(value?: string | null): WeddingType {
  const type = normalize(String(value || 'local')).replace(/\s/g, '_');
  if (type === 'venue' || type === 'venue_based') return 'venue_based';
  if (type === 'restaurant') return 'restaurant';
  if (type === 'backyard') return 'backyard';
  if (type === 'domestic_destination') return 'domestic_destination';
  if (type === 'international_destination') return 'international_destination';
  if (type === 'multi_day' || type === 'multi_day_celebration') return 'multi_day';
  return 'local';
}

export function weddingTypeLabel(value?: string | null) {
  return normalizeWeddingType(value).replace(/_/g, ' ');
}

export function findCostBenchmark(location?: string | null, benchmarks: CostBenchmark[] = COST_BENCHMARKS): CostBenchmark {
  const normalized = normalize(location || '');
  if (!normalized) return benchmarks[0];

  const matches = benchmarks
    .map((benchmark) => ({
      benchmark,
      score: benchmark.aliases.reduce((best, alias) => {
        const normalizedAlias = normalize(alias);
        if (!normalizedAlias) return best;
        if (normalized === normalizedAlias) return Math.max(best, normalizedAlias.length + 200);
        if (normalized.includes(normalizedAlias)) return Math.max(best, normalizedAlias.length + 100);
        if (normalizedAlias.includes(normalized)) return Math.max(best, normalized.length + 50);
        return best;
      }, 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.benchmark ?? benchmarks[0];
}

export function weddingTypeMultiplier(type: WeddingType) {
  const multipliers: Record<WeddingType, number> = {
    local: 1,
    venue_based: 1.05,
    restaurant: 0.9,
    backyard: 0.86,
    domestic_destination: 1.15,
    international_destination: 1.28,
    multi_day: 1.34,
  };
  return multipliers[type];
}

function fitForRatio(ratio: number, confidence?: string | null): BudgetFit {
  const firmDrag = confidence === 'firm' ? 0.04 : 0;
  if (ratio >= 0.98 + firmDrag) return 'peaceful';
  if (ratio >= 0.84 + firmDrag) return 'close';
  if (ratio >= 0.68 + firmDrag) return 'stretched';
  return 'at risk';
}

function priorityMatches(category: string, priorities: string[]) {
  const haystack = priorities.map(normalize).join(' ');
  const rule = PRIORITY_RULES.find((entry) => entry.categories.includes(category) && entry.terms.some((term) => haystack.includes(term)));
  return rule?.reason;
}

function categorySuggestions(input: MoneyMapInput, targetBudget: number): CategorySuggestion[] {
  const categoryNames = input.categoryNames?.length ? input.categoryNames : Object.keys(DEFAULT_CATEGORY_WEIGHTS);
  const priorities = input.dreamPriorities ?? [];
  const weights = categoryNames.map((name) => {
    const base = DEFAULT_CATEGORY_WEIGHTS[name] ?? 1.5;
    const reason = priorityMatches(name, priorities);
    return { name, weight: reason ? base * 1.18 : base, reason };
  });
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0) || 1;

  return weights.map((item) => {
    const share = item.weight / totalWeight;
    return {
      name: item.name,
      amount: dollars(targetBudget * share),
      share,
      compassProtected: Boolean(item.reason),
      reason: item.reason,
    };
  });
}

function pressurePoints(input: MoneyMapInput, estimate: Pick<MoneyMapEstimate, 'benchmark' | 'guestCount' | 'likelyLow' | 'midpoint' | 'targetBudget' | 'fit'>) {
  const points: string[] = [];
  const averageGuests = estimate.benchmark.averageGuestCount ?? 117;
  if (estimate.guestCount > averageGuests + 20) {
    points.push('Guest count is above the benchmark assumption, so catering, bar, seating, rentals, invitations, favors, and staffing are likely to carry the most pressure.');
  }
  if (estimate.targetBudget < estimate.likelyLow) {
    points.push('The target budget sits below the likely local range, which means the plan needs early tradeoffs before vendor conversations harden into commitments.');
  }
  if (normalizeWeddingType(input.weddingType) === 'backyard') {
    points.push('Backyard weddings can look simpler, but rentals, restrooms, power, weather backup, staffing, and cleanup can quietly move money back into the plan.');
  }
  if (normalizeWeddingType(input.weddingType).includes('destination')) {
    points.push('Destination choices move pressure into travel, lodging, welcome moments, schedule complexity, and guest support.');
  }
  if (estimate.fit === 'peaceful') {
    points.push('The current target appears to have room for a thoughtful plan, as long as major quotes are checked before the design layer expands.');
  }
  return points.slice(0, 4);
}

function firstDecisions(input: MoneyMapInput, fit: BudgetFit) {
  const priorities = (input.dreamPriorities ?? []).map(normalize).join(' ');
  const decisions = ['Confirm the guest-count ceiling before comparing venues or catering packages.'];
  if (priorities.includes('food') || priorities.includes('hospitality')) decisions.push('Price catering and bar early, because hospitality is part of the Dream and should not be guessed.');
  if (priorities.includes('photo')) decisions.push('Protect photography quotes before moving extra money into decor or upgrades.');
  if (fit === 'stretched' || fit === 'at risk') decisions.push('Choose the two areas that can be simpler before asking vendors for premium versions.');
  decisions.push('Keep the emergency buffer visible until the largest contracts are signed.');
  return [...new Set(decisions)].slice(0, 4);
}

function compassAlignment(input: MoneyMapInput, suggestions: CategorySuggestion[]) {
  const protectedCategories = suggestions.filter((item) => item.compassProtected).slice(0, 4);
  if (!protectedCategories.length) return ['Once the Dream priorities are richer, Money Map can compare spending against the Wedding Compass instead of only against the market.'];
  return protectedCategories.map((item) => `${item.name} is being protected because ${item.reason?.replace('protected by the Compass around ', '')}.`);
}

function holdSummary(fit: BudgetFit, input: MoneyMapInput, estimate: { targetBudget: number; midpoint: number; benchmark: CostBenchmark; guestCount: number }) {
  const location = input.location?.trim() || estimate.benchmark.locationName;
  if (fit === 'peaceful') {
    return `This budget can likely hold the wedding you are describing in ${location}, with room for thoughtful choices and a real cushion if the largest quotes stay near the map.`;
  }
  if (fit === 'close') {
    return `This budget is close for ${location}. It can likely work, but the first quotes need to protect the Compass priorities before the design extras expand.`;
  }
  if (fit === 'stretched') {
    return `This budget may still be possible in ${location}, but it is asking for careful tradeoffs. Guest count, venue inclusions, food service, and rentals should be decided before smaller upgrades.`;
  }
  return `This plan is asking for more than the current budget can comfortably hold in ${location}. That does not mean the Dream is wrong; it means the shape of the wedding needs a calmer version before commitments begin.`;
}

export function estimateMoneyMap(input: MoneyMapInput, benchmarks: CostBenchmark[] = COST_BENCHMARKS): MoneyMapEstimate {
  const benchmark = findCostBenchmark(input.location, benchmarks);
  const weddingType = normalizeWeddingType(input.weddingType);
  const guestCount = Math.max(1, Math.round(toNumber(input.guestCount, benchmark.averageGuestCount ?? 117)));
  const targetBudget = Math.max(0, Math.round(toNumber(input.targetBudget, benchmark.averageCost)));
  const averageGuests = benchmark.averageGuestCount ?? 117;
  const guestRatio = guestCount / averageGuests;
  const guestAdjusted = benchmark.averageCost * (0.45 + 0.55 * guestRatio);
  const adjustedAverage = dollars(guestAdjusted * weddingTypeMultiplier(weddingType));
  const likelyLow = dollars(adjustedAverage * 0.84);
  const likelyHigh = dollars(adjustedAverage * 1.2);
  const midpoint = dollars((likelyLow + likelyHigh) / 2);
  const fitRatio = targetBudget > 0 ? targetBudget / midpoint : 0;
  const fit = fitForRatio(fitRatio, input.budgetConfidence);
  const suggestions = categorySuggestions(input, targetBudget || midpoint);
  const estimate = {
    benchmark,
    guestCount,
    targetBudget,
    weddingType,
    adjustedAverage,
    likelyLow,
    likelyHigh,
    midpoint,
    budgetGap: dollars(targetBudget - midpoint),
    fitRatio,
    fit,
    perGuestTarget: dollars(targetBudget / guestCount),
    perGuestMarket: dollars(midpoint / guestCount),
    categorySuggestions: suggestions,
    pressurePoints: [] as string[],
    firstDecisions: [] as string[],
    compassAlignment: [] as string[],
    holdSummary: '',
    assumptions: [] as string[],
  };

  estimate.pressurePoints = pressurePoints(input, estimate);
  estimate.firstDecisions = firstDecisions(input, fit);
  estimate.compassAlignment = compassAlignment(input, suggestions);
  estimate.holdSummary = holdSummary(fit, input, estimate);
  estimate.assumptions = [
    `Benchmark: ${benchmark.locationName}, ${benchmark.sourceName} ${benchmark.sourceYear}.`,
    `Guest count: ${guestCount}, compared with benchmark average ${averageGuests}.`,
    `Wedding type: ${weddingTypeLabel(weddingType)} with a planning multiplier of ${weddingTypeMultiplier(weddingType).toFixed(2)}.`,
    'Real quotes, contracts, deposits, and payment milestones should replace this estimate over time.',
  ];

  return estimate;
}
