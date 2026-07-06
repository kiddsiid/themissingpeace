import { describe, it, expect } from 'vitest';
import { buildCompass, type DreamResponses } from '@/lib/engine/compass';

describe('buildCompass', () => {
  it('assembles structured fields and uses the injected summarize', async () => {
    const dream: DreamResponses = {
      priorities: ['food', 'intimacy', 'guest experience'],
      nonNegotiables: ['live music'],
      avoid: ['overproduction'],
      traditions: ['tea ceremony'],
    };
    const compass = await buildCompass(dream, async (d) => ({ summary: `top: ${d.priorities?.[0]}`, tone: 'intimate' }));
    expect(compass.summary).toBe('top: food');
    expect(compass.tone).toBe('intimate');
    expect(compass.priorities).toEqual(['food', 'intimacy', 'guest experience']);
    expect(compass.nonNegotiables).toEqual(['live music']);
    expect(compass.traditions).toEqual(['tea ceremony']);
  });
});
