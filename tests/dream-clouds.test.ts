import { describe, expect, it } from 'vitest';
import {
  cloudRankLabel,
  compassSentence,
  compassShort,
  normalizedCloudPriority,
  rankedDreamClouds,
} from '@/lib/engine/dream-clouds';

describe('Dream Cloud Compass', () => {
  it('ranks clouds deterministically by priority', () => {
    const ranked = rankedDreamClouds({ music: 0.95, family: 0.8, ease: 0.7 });
    expect(ranked.slice(0, 3).map((entry) => entry.cloud.id)).toEqual(['music', 'family', 'ease']);
  });

  it('uses the homepage status words', () => {
    expect(cloudRankLabel(0, 0.8)).toBe('Guiding the compass');
    expect(cloudRankLabel(2, 0.6)).toBe('Held close');
    expect(cloudRankLabel(4, 0.5)).toBe('Rising');
    expect(cloudRankLabel(5, 0.2)).toBe('In the constellation');
  });

  it('builds the canonical short and editorial sentences', () => {
    const priorities = { family: 1, warmth: 0.9, table: 0.8 };
    expect(compassShort(priorities)).toBe('Rooted in family & our people, lifted by warmth over show.');
    expect(compassSentence(priorities)).toContain('one long, generous table of food');
  });

  it('clamps malformed priorities', () => {
    expect(normalizedCloudPriority(9)).toBe(1);
    expect(normalizedCloudPriority(-2)).toBe(0.04);
    expect(normalizedCloudPriority('bad')).toBe(0.4);
  });
});
