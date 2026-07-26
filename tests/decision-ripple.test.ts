import { describe, expect, it } from 'vitest';
import { deriveDecisionRipple } from '@/lib/engine/decision-ripple';

describe('decision ripple preview', () => {
  it('covers the plated-meal release scenario before apply', () => {
    const effects = deriveDecisionRipple('menu', 'Family style', 'Plated');
    expect(effects.map((effect) => effect.type)).toEqual([
      'staffing',
      'rentals',
      'timeline',
      'caterer_brief',
      'seating',
      'money_map',
    ]);
  });

  it('returns a bounded fallback for an unknown category', () => {
    expect(deriveDecisionRipple('other')).toHaveLength(2);
  });
});
