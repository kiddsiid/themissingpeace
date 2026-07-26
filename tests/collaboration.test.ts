import { describe, expect, it } from 'vitest';
import { combineConflictValues, mergeConflict } from '@/lib/collaboration/merge-conflict';
import { markDraftRetry, parseDraftQueue, removeDraft, upsertDraft } from '@/lib/collaboration/draft-queue';
import { staleOutput, stableSourceHash } from '@/lib/outputs/freshness';

describe('collaboration merge', () => {
  it('automatically merges edits to different fields', () => {
    const base = { title: 'Dinner', note: 'Warm' };
    const result = mergeConflict(base, { title: 'Plated dinner', note: 'Warm' }, { title: 'Dinner', note: 'Candlelit' });
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged).toEqual({ title: 'Plated dinner', note: 'Candlelit' });
  });

  it('surfaces same-field edits and combines text explicitly', () => {
    const result = mergeConflict({ note: 'Base' }, { note: 'Mine' }, { note: 'Theirs' });
    expect(result.conflicts[0]?.field).toBe('note');
    expect(combineConflictValues('Mine', 'Theirs')).toBe('Mine\nTheirs');
  });
});

describe('local collaboration draft queue', () => {
  it('keeps one current draft per object with its base version and retry metadata', () => {
    const first = { id: 'decision-1', baseVersion: 2, changes: { rationale: 'First' }, timestamp: 10, retryCount: 0 };
    const newer = { ...first, changes: { rationale: 'Newer' }, timestamp: 20 };
    const queued = upsertDraft(upsertDraft([], first), newer);

    expect(queued).toEqual([newer]);
    expect(markDraftRetry(queued, 'decision-1', 30)[0]).toMatchObject({ retryCount: 1, timestamp: 30 });
    expect(removeDraft(queued, 'decision-1')).toEqual([]);
  });

  it('ignores corrupt storage instead of blocking editing', () => {
    expect(parseDraftQueue('{broken')).toEqual([]);
    expect(parseDraftQueue(JSON.stringify([{ nope: true }]))).toEqual([]);
  });
});

describe('output freshness', () => {
  it('marks changed or explicitly stale outputs while preserving current versions', () => {
    expect(staleOutput('next', { source_hash: 'prior', is_stale: false })).toBe(true);
    expect(staleOutput('same', { source_hash: 'same', is_stale: false })).toBe(false);
    expect(staleOutput('same', { source_hash: 'same', is_stale: true })).toBe(true);
  });

  it('hashes the same source deterministically', () => {
    expect(stableSourceHash({ a: 1, b: 2 })).toBe(stableSourceHash({ b: 2, a: 1 }));
  });
});
