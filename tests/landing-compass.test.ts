import { describe, expect, it } from 'vitest';

import {
  CLOSE_THRESHOLD,
  CLOUDS,
  CloudPositions,
  POS,
  POS_MOBILE,
  centre,
  clampPosition,
  cloudAriaLabel,
  cloudMetrics,
  compassShort,
  initialPositions,
  isMobileBoard,
  priority,
  rankLabel,
  ranked,
  sentence,
  toggleCloud,
} from '../src/lib/landing/compass';

const DESKTOP = { width: 900, height: 620 };

function positions(overrides: Partial<Record<string, { x: number; y: number }>> = {}): CloudPositions {
  const base = initialPositions(false);
  for (const [id, p] of Object.entries(overrides)) {
    if (p) base[id as keyof CloudPositions] = p;
  }
  return base;
}

describe('dream cloud data', () => {
  it('carries the seven prototype clouds with a phrase each', () => {
    expect(CLOUDS).toHaveLength(7);
    expect(CLOUDS.map((c) => c.id)).toEqual([
      'family',
      'warmth',
      'table',
      'music',
      'beauty',
      'ease',
      'memory',
    ]);
    for (const cloud of CLOUDS) {
      expect(cloud.phrase.length).toBeGreaterThan(0);
      expect(cloud.label.length).toBeGreaterThan(0);
      expect(cloud.type.length).toBeGreaterThan(0);
    }
  });

  it('gives every cloud a home position in both constellations', () => {
    for (const cloud of CLOUDS) {
      expect(POS[cloud.id]).toBeDefined();
      expect(POS_MOBILE[cloud.id]).toBeDefined();
    }
  });

  it('starts family closest to the moon on desktop', () => {
    const r = ranked(initialPositions(false));
    expect(r[0].cloud.id).toBe('family');
  });
});

describe('priority curve', () => {
  it('is 1 at or inside 120px and never exceeds 1', () => {
    expect(priority({ x: 0, y: 0 })).toBe(1);
    expect(priority({ x: 0, y: 120 })).toBe(1);
    expect(priority({ x: 100, y: 0 })).toBe(1);
  });

  it('floors at 0.04 rather than going negative', () => {
    expect(priority({ x: 0, y: 5000 })).toBe(0.04);
  });

  it('decreases monotonically with distance', () => {
    const a = priority({ x: 0, y: 150 });
    const b = priority({ x: 0, y: 250 });
    const c = priority({ x: 0, y: 350 });
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it('depends on radius only, not direction', () => {
    expect(priority({ x: 0, y: 200 })).toBeCloseTo(priority({ x: 200, y: 0 }), 10);
    expect(priority({ x: 0, y: -200 })).toBeCloseTo(priority({ x: 200, y: 0 }), 10);
  });
});

describe('ranking and status words', () => {
  it('sorts by priority descending and indexes from zero', () => {
    const r = ranked(positions({ music: { x: 0, y: 0 } }));
    expect(r[0].cloud.id).toBe('music');
    expect(r[0].index).toBe(0);
    for (let i = 1; i < r.length; i += 1) {
      expect(r[i - 1].priority).toBeGreaterThanOrEqual(r[i].priority);
      expect(r[i].index).toBe(i);
    }
  });

  it('uses exactly the four calm status words', () => {
    expect(rankLabel(0, 1)).toBe('Guiding the compass');
    expect(rankLabel(1, 0.9)).toBe('Held close');
    expect(rankLabel(2, 0.9)).toBe('Held close');
    expect(rankLabel(3, 0.5)).toBe('Rising');
    expect(rankLabel(6, 0.1)).toBe('In the constellation');
  });

  it('never labels a cloud with a score or a selection word', () => {
    const words = ranked(positions()).map((r) => r.label);
    for (const word of words) {
      expect(word).not.toMatch(/select|chosen|score|%|\d/i);
    }
  });
});

describe('readouts', () => {
  it('names the top three clouds in the long sentence', () => {
    const p = positions({
      table: { x: 0, y: 0 },
      music: { x: 10, y: 0 },
      beauty: { x: 20, y: 0 },
    });
    const r = ranked(p);
    const s = sentence(p);
    expect(s).toBe(
      `A wedding built around ${r[0].cloud.phrase} — ${r[1].cloud.phrase}, and ${r[2].cloud.phrase}.`,
    );
    expect(s).toContain('one long, generous table of food');
  });

  it('reads the moon face from the top two clouds, lowercased', () => {
    const p = positions({ ease: { x: 0, y: 0 }, beauty: { x: 0, y: 140 } });
    expect(compassShort(p)).toBe('Rooted in ease & calm, lifted by soft beauty.');
  });

  it('changes when a cloud is dragged closer', () => {
    const before = sentence(initialPositions(false));
    const after = sentence(positions({ music: { x: 0, y: 0 } }));
    expect(after).not.toBe(before);
    expect(after.startsWith('A wedding built around music and dancing')).toBe(true);
  });
});

describe('board geometry', () => {
  it('treats narrow boards as mobile at the 620px line', () => {
    expect(isMobileBoard(619)).toBe(true);
    expect(isMobileBoard(620)).toBe(false);
  });

  it('centres the moon on desktop and lifts it on mobile', () => {
    expect(centre(900, 620)).toEqual({ x: 450, y: 310 });
    const m = centre(400, 900);
    expect(m.x).toBe(200);
    expect(m.y).toBeCloseTo(144, 6);
  });

  it('clamps a cloud inside the board on every edge', () => {
    const far = clampPosition({ x: 9999, y: 9999 }, DESKTOP);
    expect(far.x).toBe(DESKTOP.width / 2 - 40);
    expect(far.y).toBe(DESKTOP.height - centre(DESKTOP.width, DESKTOP.height).y - 40);

    const near = clampPosition({ x: -9999, y: -9999 }, DESKTOP);
    expect(near.x).toBe(-(DESKTOP.width / 2 - 40));
    expect(near.y).toBe(-(centre(DESKTOP.width, DESKTOP.height).y - 40));
  });

  it('leaves an in-bounds cloud untouched', () => {
    expect(clampPosition({ x: 40, y: -20 }, DESKTOP)).toEqual({ x: 40, y: -20 });
  });
});

describe('cloud metrics', () => {
  it('grows the cloud and its type as priority rises', () => {
    const near = cloudMetrics(0, 1);
    const far = cloudMetrics(5, 0.04);
    expect(near.width).toBeGreaterThan(far.width);
    expect(near.labelSize).toBeGreaterThanOrEqual(far.labelSize);
  });

  it('lifts the top three above the rest and golds their status word', () => {
    expect(cloudMetrics(2, 0.8).zIndex).toBe(12);
    expect(cloudMetrics(3, 0.8).zIndex).toBe(10);
    expect(cloudMetrics(0, 1).rankColor).toBe('var(--gold)');
    expect(cloudMetrics(4, 1).rankColor).toBe('var(--ink-faint)');
    expect(cloudMetrics(0, 1).sparkOpacity).toBeGreaterThan(cloudMetrics(4, 1).sparkOpacity);
  });

  it('keeps label sizing inside the legible band', () => {
    expect(cloudMetrics(0, 1).labelSize).toBeLessThanOrEqual(17.5);
    expect(cloudMetrics(6, 0).labelSize).toBeGreaterThanOrEqual(11.5);
  });

  it('staggers the float so no two neighbours breathe together', () => {
    expect(cloudMetrics(0, 1).floatDuration).toBe('7.5s');
    expect(cloudMetrics(1, 1).floatDuration).toBe('8s');
    expect(cloudMetrics(4, 1).floatDelay).toBe('0s');
  });
});

describe('keyboard interaction', () => {
  it('pulls a distant cloud 65% closer and pulses the moon', () => {
    const p = positions({ music: { x: 0, y: 400 } });
    expect(priority(p.music)).toBeLessThan(CLOSE_THRESHOLD);
    const result = toggleCloud('music', p, false);
    expect(result.pulsed).toBe(true);
    expect(Math.abs(result.position.y)).toBeLessThan(Math.abs(p.music.y));
    expect(priority(result.position)).toBeGreaterThan(priority(p.music));
  });

  it('returns a cloud already held close to its place in the constellation', () => {
    const p = positions({ music: { x: 0, y: 0 } });
    expect(priority(p.music)).toBeGreaterThan(CLOSE_THRESHOLD);
    const result = toggleCloud('music', p, false);
    expect(result.position).toEqual(POS.music);
    expect(result.pulsed).toBe(false);
  });

  it('returns to the mobile constellation on a narrow board', () => {
    const p = positions({ table: { x: 0, y: 0 } });
    expect(toggleCloud('table', p, true).position).toEqual(POS_MOBILE.table);
  });
});

describe('accessibility copy', () => {
  it('describes the cloud, its type, its status and how to move it', () => {
    const label = cloudAriaLabel(CLOUDS[0], 'Guiding the compass');
    expect(label).toBe(
      'Family & our people, Our people. Guiding the compass. Drag toward the moon, or use arrow keys to move it.',
    );
    expect(label).toContain('arrow keys');
  });
});
