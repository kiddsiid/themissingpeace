import { describe, expect, it } from 'vitest';
import { estimateMoneyMap, findCostBenchmark } from '@/lib/engine/money-map';

describe('Money Map estimate engine', () => {
  it('matches the most specific location benchmark', () => {
    expect(findCostBenchmark('New York City, NY').locationName).toBe('New York City');
    expect(findCostBenchmark('Charlotte, North Carolina').locationName).toBe('Charlotte');
  });

  it('raises the likely range when guest count rises', () => {
    const small = estimateMoneyMap({ location: 'Indianapolis', guestCount: 80, targetBudget: 25000 });
    const large = estimateMoneyMap({ location: 'Indianapolis', guestCount: 150, targetBudget: 25000 });
    expect(large.midpoint).toBeGreaterThan(small.midpoint);
    expect(large.pressurePoints.join(' ')).toContain('Guest count');
  });

  it('returns calm fit readings from the target budget compared with the market map', () => {
    expect(estimateMoneyMap({ location: 'Charlotte', guestCount: 117, targetBudget: 50000 }).fit).toBe('peaceful');
    expect(estimateMoneyMap({ location: 'New York City', guestCount: 150, targetBudget: 25000, budgetConfidence: 'firm' }).fit).toBe('at risk');
  });

  it('protects categories that match the Wedding Compass priorities', () => {
    const estimate = estimateMoneyMap({
      location: 'National average',
      guestCount: 117,
      targetBudget: 40000,
      dreamPriorities: ['food', 'photography', 'guest experience'],
      categoryNames: ['Catering', 'Photography', 'Florals', 'Emergency buffer'],
    });
    const protectedNames = estimate.categorySuggestions.filter((category) => category.compassProtected).map((category) => category.name);
    expect(protectedNames).toContain('Catering');
    expect(protectedNames).toContain('Photography');
  });
});
