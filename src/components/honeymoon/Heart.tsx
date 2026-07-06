'use client';
// Honeymoon activity voting — collaborative hearts, same feel as the playlist.
import { useTransition } from 'react';
import { toggleHoneymoonHeart } from '@/app/(app)/honeymoon/actions';

export function HoneymoonHeart({ itemId, count, mine }: { itemId: string; count: number; mine: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await toggleHoneymoonHeart(itemId); })}
      disabled={pending}
      className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-transform hover:-translate-y-0.5 ' + (mine ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}
      title="Dream of this together"
    >
      <span>{mine ? '♥' : '♡'}</span>{count > 0 ? count : ''}
    </button>
  );
}
