import { describe, it, expect } from 'vitest';
import { mix, tint, shade, readableInk } from '@/lib/canvas/color';
import {
  feastProgress,
  atmosphereProgress,
  atelierProgress,
  isLookBlessed,
} from '@/lib/canvas/progress';
import { CANVAS_SEED, SEED_WEDDING_CONTEXT } from '@/lib/canvas/seed';

// Smoke coverage for the Living Canvas (0014 WIP): the pure helpers that both the
// hub and the studios depend on, plus the integrity of the seed board. These run
// without a database (no store.ts import) so they stay fast and deterministic.

describe('canvas/color', () => {
  it('mixes channels linearly', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
  });
  it('expands 3-digit hex and tolerates missing hash', () => {
    expect(mix('fff', '#000000', 0)).toBe('#ffffff');
  });
  it('tint lightens, shade darkens', () => {
    expect(tint('#808080', 0)).toBe('#808080');
    expect(shade('#ffffff', 1)).toBe('#000000');
  });
  it('readableInk picks dark ink on light swatches and light on dark', () => {
    expect(readableInk('#ffffff')).toBe('#3A3631');
    expect(readableInk('#000000')).toBe('#FFFDF9');
    // sage primary is a mid tone -> light ink for legibility
    expect(readableInk('#8A9A80')).toBe('#FFFDF9');
  });
});

describe('canvas/progress', () => {
  it('feast: every seeded course has a dish, so it reads well-shaped', () => {
    const p = feastProgress(CANVAS_SEED);
    expect(p.pct).toBeGreaterThanOrEqual(66);
    expect(p.aligned).toBe(true);
    expect(p.statusLabel).toMatch(/moments shaped/);
  });
  it('atmosphere: aligned when wedding palette matches the board palette name', () => {
    expect(atmosphereProgress(CANVAS_SEED, SEED_WEDDING_CONTEXT.weddingPalette).pct).toBe(100);
    expect(atmosphereProgress(CANVAS_SEED, 'Something Else').pct).toBe(55);
  });
  it('atelier: only fully-approved looks count as blessed', () => {
    const p = atelierProgress(CANVAS_SEED);
    expect(p.pct).toBe(33); // 1 of 3 seed looks approved by everyone
  });
  it('isLookBlessed requires at least one approver and unanimous approval', () => {
    expect(isLookBlessed({ a: true, b: true })).toBe(true);
    expect(isLookBlessed({ a: true, b: false })).toBe(false);
    expect(isLookBlessed({})).toBe(false);
  });
});

describe('canvas/seed integrity', () => {
  it('has all four board branches populated', () => {
    expect(CANVAS_SEED.food.courses.length).toBeGreaterThan(0);
    expect(CANVAS_SEED.palette.colors).toHaveLength(5);
    expect(CANVAS_SEED.palette.roles).toHaveLength(5);
    expect(CANVAS_SEED.attire.looks.length).toBeGreaterThan(0);
    expect(CANVAS_SEED.inspirations.length).toBeGreaterThan(0);
  });
  it('every course carries a valid slot and at least one dish', () => {
    const slots = new Set(['welcome', 'grazing', 'starter', 'main', 'dessert', 'late', 'tea']);
    for (const c of CANVAS_SEED.food.courses) {
      expect(slots.has(c.slot)).toBe(true);
      expect(c.dishes.length).toBeGreaterThan(0);
    }
  });
});
