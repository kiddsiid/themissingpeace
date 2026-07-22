import { describe, it, expect } from 'vitest';
import { deriveRippleImpact } from '@/lib/engine/ripple';

describe('ripple: impact derivation', () => {
  it('maps a settled venue decision to its high-impact areas', () => {
    const impact = deriveRippleImpact({ sourceType: 'decision', changeKind: 'approved', category: 'venue' });
    const areas = impact.map((i) => i.area);
    expect(areas).toEqual(expect.arrayContaining(['budget', 'seating', 'timeline', 'vendors']));
    expect(impact.find((i) => i.area === 'budget')?.severity).toBe('high');
  });

  it('falls back gracefully for an unknown decision category', () => {
    const impact = deriveRippleImpact({ sourceType: 'decision', changeKind: 'approved', category: 'zzz' });
    expect(impact).toHaveLength(1);
    expect(impact[0].area).toBe('decisions');
  });

  it('guest_count ripples into budget, seating, canvas, guests', () => {
    const areas = deriveRippleImpact({ sourceType: 'guest_count', changeKind: 'updated' }).map((i) => i.area);
    expect(areas).toEqual(expect.arrayContaining(['budget', 'seating', 'canvas', 'guests']));
  });

  it('a compass change ripples into dream, decisions, canvas', () => {
    const areas = deriveRippleImpact({ sourceType: 'compass', changeKind: 'updated' }).map((i) => i.area);
    expect(areas).toEqual(expect.arrayContaining(['dream', 'decisions', 'canvas']));
  });

  it('always returns at least one impact', () => {
    for (const sourceType of ['decision', 'budget_item', 'vendor', 'guest_count', 'compass', 'task', 'board_item'] as const) {
      expect(deriveRippleImpact({ sourceType, changeKind: 'updated' }).length).toBeGreaterThan(0);
    }
  });
});
