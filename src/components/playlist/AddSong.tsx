'use client';
import { useState, useTransition } from 'react';
import { addTrack } from '@/app/(app)/playlist/actions';
import type { PlaylistMoment } from '@/lib/types';

const MOMENTS: { value: PlaylistMoment; label: string }[] = [
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'cocktail', label: 'Cocktail hour' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'first_dance', label: 'First dance' },
  { value: 'party', label: 'Dance floor' },
  { value: 'do_not_play', label: 'Do not play' },
];

export function AddSong({ defaultMoment = 'party' }: { defaultMoment?: PlaylistMoment }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <form
      id="add-song-form"
      action={(formData) => start(async () => {
        await addTrack(formData);
        (document.getElementById('add-song-form') as HTMLFormElement)?.reset();
      })}
      className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input name="url" placeholder="Paste a Spotify, Apple Music, or YouTube link"
          className="min-w-[220px] flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--gold)]" />
        <select name="moment" defaultValue={defaultMoment} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">
          {MOMENTS.map((moment) => <option key={moment.value} value={moment.value}>{moment.label}</option>)}
        </select>
        <button disabled={pending} className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white disabled:opacity-60">{pending ? 'Adding...' : 'Add'}</button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-xs text-[var(--ink-faint)] underline">{open ? 'hide' : 'no link?'}</button>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input name="title" placeholder="Song title" className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <input name="artist" placeholder="Artist" className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <input name="note" placeholder="why it matters" className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        </div>
      )}
    </form>
  );
}
