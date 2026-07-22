import { describe, it, expect } from 'vitest';
import {
  buildEntityIndex,
  isCitationGrounded,
  groundedCitations,
  guardClaims,
  contextInputHash,
  type Citation,
} from '@/lib/engine/weaver';

const context = {
  weddingCompass: { summary: 'warmth over show' },
  deterministicFacts: [{ kind: 'projected_overage', value: 1200 }, { kind: 'overdue_tasks', value: 2 }],
  budgetItems: [{ id: 'b1' }, { id: 'b2' }],
  vendors: [{ id: 'v1' }],
  decisions: [{ id: 'd1' }],
  tasks: [{ id: 't1' }],
  boardItems: [{ id: 'bi1' }],
};

describe('weaver: entity index + citation grounding', () => {
  const idx = buildEntityIndex(context);

  it('indexes ids per type, fact kinds, and compass presence', () => {
    expect(idx.ids.budget_item.has('b1')).toBe(true);
    expect(idx.ids.vendor.has('v1')).toBe(true);
    expect(idx.factKinds.has('projected_overage')).toBe(true);
    expect(idx.hasCompass).toBe(true);
  });

  it('grounds only citations that point at real things', () => {
    expect(isCitationGrounded({ type: 'budget_item', id: 'b1' }, idx)).toBe(true);
    expect(isCitationGrounded({ type: 'budget_item', id: 'nope' }, idx)).toBe(false);
    expect(isCitationGrounded({ type: 'fact', id: 'projected_overage' }, idx)).toBe(true);
    expect(isCitationGrounded({ type: 'fact', id: 'made_up' }, idx)).toBe(false);
    expect(isCitationGrounded({ type: 'compass' }, idx)).toBe(true);
    // compass grounding depends on presence
    expect(isCitationGrounded({ type: 'compass' }, buildEntityIndex({}))).toBe(false);
  });

  it('filters + dedupes citations', () => {
    const cs: Citation[] = [
      { type: 'budget_item', id: 'b1' },
      { type: 'budget_item', id: 'b1' }, // dup
      { type: 'vendor', id: 'ghost' },   // ungrounded
      { type: 'decision', id: 'd1' },
    ];
    expect(groundedCitations(cs, idx)).toEqual([
      { type: 'budget_item', id: 'b1', label: undefined },
      { type: 'decision', id: 'd1', label: undefined },
    ]);
  });
});

describe('weaver: deterministic guard', () => {
  const idx = buildEntityIndex(context);

  it('drops AI claims that cite nothing real, keeps grounded ones', () => {
    const { kept, dropped, coverage } = guardClaims(
      [
        { type: 'next_action', title: 'Lock the venue', citations: [{ type: 'decision', id: 'd1' }] },
        { type: 'next_action', title: 'Vibes are off', citations: [] }, // no citation -> dropped
        { type: 'budget', title: 'Trim catering', citations: [{ type: 'budget_item', id: 'ghost' }] }, // ungrounded -> dropped
      ],
      idx,
    );
    expect(kept.map((k) => k.title)).toEqual(['Lock the venue']);
    expect(dropped).toHaveLength(2);
    expect(dropped.every((d) => d.dropReason === 'no grounded citation')).toBe(true);
    expect(kept[0].source).toBe('ai');
    expect(coverage).toBeCloseTo(1 / 3, 4);
  });

  it('coverage is 1 for an empty claim set (nothing to ground)', () => {
    expect(guardClaims([], idx).coverage).toBe(1);
  });
});

describe('weaver: input hash', () => {
  it('is stable and independent of key order', () => {
    const a = contextInputHash({ x: 1, y: [1, 2], z: { m: 1, n: 2 } });
    const b = contextInputHash({ z: { n: 2, m: 1 }, y: [1, 2], x: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });
  it('changes when content changes', () => {
    expect(contextInputHash({ x: 1 })).not.toBe(contextInputHash({ x: 2 }));
  });
});
