// Smart tagging + mood extraction (Board Overhaul) — the deterministic halves.
import { describe, expect, it } from 'vitest';
import { inferTags } from '../src/lib/board/tags';
import { deterministicMood } from '../src/lib/engine/mood';

describe('inferTags', () => {
  it('anchors on the board type', () => {
    expect(inferTags({ title: 'Something lovely', boardType: 'florals_decor' })).toContain('florals');
    expect(inferTags({ title: 'Something lovely', boardType: 'venue' })).toContain('venue');
  });

  it('reads keywords from the title', () => {
    const tags = inferTags({ title: 'Blush peony centerpiece for a garden ceremony' });
    expect(tags).toContain('florals');
    expect(tags).toContain('garden');
    expect(tags).toContain('blush');
  });

  it('tags the source platform from the URL', () => {
    expect(inferTags({ url: 'https://www.pinterest.com/pin/12345/' })).toContain('pinterest');
    expect(inferTags({ url: 'https://youtu.be/abc123' })).toContain('video');
  });

  it('never exceeds six tags and never duplicates', () => {
    const tags = inferTags({
      title: 'Elegant romantic vintage garden venue with blush florals, gold candles, cake and band',
      url: 'https://www.pinterest.com/pin/1/',
      boardType: 'venue',
    });
    expect(tags.length).toBeLessThanOrEqual(6);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('returns empty for an unrecognizable item', () => {
    expect(inferTags({ title: 'xyzzy' })).toEqual([]);
  });
});

describe('deterministicMood', () => {
  it('names the leanings from approved pieces', () => {
    const r = deterministicMood([
      { title: 'Garden ceremony under string lights', tags: ['garden', 'lighting'] },
      { title: 'Candlelit family-style dinner', tags: ['food & beverage'] },
      { title: 'Blush and sage palette', tags: ['blush', 'green'] },
    ]);
    expect(r.leanings.length).toBeGreaterThan(0);
    expect(r.summary).toMatch(/leaning/);
    expect(r.summary).not.toMatch(/!/); // calm, no exclamation
  });

  it('stays gentle when there is no signal yet', () => {
    const r = deterministicMood([]);
    expect(r.leanings).toEqual([]);
    expect(r.summary.length).toBeGreaterThan(10);
  });

  it('caps leanings at four', () => {
    const r = deterministicMood([
      { title: 'romantic rustic barn with candles and blush roses in a garden by the beach, modern and elegant' },
    ]);
    expect(r.leanings.length).toBeLessThanOrEqual(4);
  });
});
