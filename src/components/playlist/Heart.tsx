'use client';
import { useTransition } from 'react';
import { toggleHeart } from '@/app/(app)/playlist/actions';

export function Heart({ trackId, count, mine }: { trackId: string; count: number; mine: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await toggleHeart(trackId); })}
      disabled={pending}
      className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ' + (mine ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}
      title="Love this song"
    >
      <span>{mine ? '♥' : '♡'}</span>{count > 0 ? count : ''}
    </button>
  );
}
