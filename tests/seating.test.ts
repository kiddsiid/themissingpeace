// Seating Studio geometry (0012 / North Star Wave A).
import { describe, expect, it } from 'vitest';
import { seatPositions, defaultFrame, firstOpenSeat, seatInitials } from '../src/lib/seating/layout';

describe('seatPositions', () => {
  it('gives every seat a stable, unique index 0..capacity-1', () => {
    for (const shape of ['round', 'rect', 'square', 'head', 'row'] as const) {
      const seats = seatPositions({ shape, w: 200, h: 120, capacity: 9 });
      expect(seats).toHaveLength(9);
      expect(new Set(seats.map((s) => s.index))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
    }
  });

  it('rings a round table — all seats equidistant from the center', () => {
    const seats = seatPositions({ shape: 'round', w: 140, h: 140, capacity: 8 });
    const dists = seats.map((s) => Math.hypot(s.x - 70, s.y - 70));
    for (const d of dists) expect(d).toBeCloseTo(dists[0], 5);
  });

  it('keeps a head table on one side only', () => {
    const seats = seatPositions({ shape: 'head', w: 300, h: 70, capacity: 6 });
    for (const s of seats) expect(s.y).toBeLessThan(0);
  });

  it('splits a rect table across both long sides', () => {
    const seats = seatPositions({ shape: 'rect', w: 300, h: 100, capacity: 6 });
    const above = seats.filter((s) => s.y < 0).length;
    const below = seats.filter((s) => s.y > 100).length;
    expect(above).toBe(3);
    expect(below).toBe(3);
  });

  it('clamps capacity to a sane range', () => {
    expect(seatPositions({ shape: 'round', w: 140, h: 140, capacity: 0 })).toHaveLength(1);
    expect(seatPositions({ shape: 'round', w: 140, h: 140, capacity: 99 })).toHaveLength(40);
  });
});

describe('defaultFrame', () => {
  it('grows round tables with capacity', () => {
    expect(defaultFrame('round', 12).w).toBeGreaterThan(defaultFrame('round', 4).w);
  });
  it('makes rows long and thin', () => {
    const f = defaultFrame('row', 8);
    expect(f.w).toBeGreaterThan(f.h * 4);
  });
});

describe('firstOpenSeat', () => {
  it('finds the first gap', () => {
    expect(firstOpenSeat(4, [0, 1, 3])).toBe(2);
  });
  it('returns null when full', () => {
    expect(firstOpenSeat(3, [0, 1, 2])).toBeNull();
  });
  it('starts at zero for an empty table', () => {
    expect(firstOpenSeat(5, [])).toBe(0);
  });
});

describe('seatInitials', () => {
  it('builds initials from names', () => {
    expect(seatInitials('Rosa', 'Alvarez')).toBe('RA');
    expect(seatInitials('Rosa', null)).toBe('R');
    expect(seatInitials(null, null)).toBe('·');
  });
});
