import { redirect } from 'next/navigation';
import { removeTrack, setTrackApproval } from '@/app/(app)/playlist/actions';
import { AddSong } from '@/components/playlist/AddSong';
import { Heart } from '@/components/playlist/Heart';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import type { PlaylistMoment } from '@/lib/types';

const ORDER: { value: PlaylistMoment; label: string; hint: string }[] = [
  { value: 'ceremony', label: 'Ceremony', hint: 'processional, vows, recessional' },
  { value: 'cocktail', label: 'Cocktail hour', hint: 'mingling and smiles' },
  { value: 'dinner', label: 'Dinner', hint: 'warm and low' },
  { value: 'first_dance', label: 'First dance', hint: 'your moment' },
  { value: 'party', label: 'Dance floor', hint: 'bring everyone in' },
  { value: 'do_not_play', label: 'Do not play', hint: 'hard no list' },
];
const SRC: Record<string, string> = { spotify: 'Spotify', apple_music: 'Apple Music', youtube: 'YouTube', soundcloud: 'SoundCloud', other: 'Link' };

export default async function PlaylistPage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();

  const [tracksRes, heartsRes] = await Promise.all([
    db.from('playlist_tracks').select('id, moment, title, artist, source, source_url, image_url, note, added_by, created_at, approval_status').eq('workspace_id', ws.id).order('created_at', { ascending: true }),
    db.from('playlist_track_hearts').select('track_id, user_id'),
  ]);
  const tracks = tracksRes.data ?? [];
  const hearts = heartsRes.data ?? [];

  const ids = new Set<string>(tracks.map((track: any) => track.added_by).filter(Boolean));
  const usersRes = ids.size ? await db.from('users').select('id, name, display_name').in('id', [...ids]) : { data: [] as any[] };
  const nameMap = new Map((usersRes.data ?? []).map((user: any) => [user.id, user.display_name || user.name || 'Someone']));

  const countFor = (id: string) => hearts.filter((heart: any) => heart.track_id === id).length;
  const mineFor = (id: string) => hearts.some((heart: any) => heart.track_id === id && heart.user_id === ws.userId);
  const byMoment = (moment: PlaylistMoment) => tracks.filter((track: any) => track.moment === moment);
  const needsApproval = tracks.filter((track: any) => (track.approval_status ?? 'proposed') === 'proposed' && track.moment !== 'do_not_play').length;

  return (
    <div className="relative mx-auto max-w-5xl">
      <span className="dream-twinkle" style={{ left: '3%', top: 0, fontSize: 13 }}>+</span>
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The soundtrack to your forever</p>
        <h1 className="voice text-4xl">Playlist</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">Songs by moment, requested by your circle, with approval tracked through hearts.</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What is missing?</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{needsApproval} songs still need approval signals.</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What does this affect?</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Ceremony timing, dinner mood, dance floor energy, and the do-not-play boundary.</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Add first-dance and ceremony songs before filling the dance floor.</p>
        </section>
      </div>

      <div className="mt-5"><AddSong /></div>

      <div className="mt-7 space-y-7">
        {ORDER.map((moment) => {
          const list = byMoment(moment.value);
          return (
            <section key={moment.value}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="voice text-xl">{moment.label}</h2>
                <span className="text-[11px] text-[var(--ink-faint)]">{moment.hint}</span>
              </div>
              {list.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--ink-faint)]">No songs yet.</p>
              ) : (
                <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                  {list.map((track: any) => {
                    const heartsForTrack = countFor(track.id);
                    return (
                      <li key={track.id} className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[var(--cream)] text-[var(--ink-faint)]">
                          {track.image_url ? <img src={track.image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px]">song</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--ink)]">
                            {track.source_url ? <a href={track.source_url} target="_blank" rel="noreferrer" className="hover:underline">{track.title}</a> : track.title}
                            {track.artist && <span className="text-[var(--ink-soft)]"> - {track.artist}</span>}
                          </p>
                          <p className="truncate text-[11px] text-[var(--ink-faint)]">
                            {SRC[track.source] || 'Link'} - added by {nameMap.get(track.added_by) || 'someone'}{track.note ? ` - ${track.note}` : ''}
                          </p>
                          <form action={setTrackApproval} className="mt-1 flex items-center gap-1">
                            <input type="hidden" name="id" value={track.id} />
                            <select name="approval_status" defaultValue={track.approval_status ?? 'proposed'} className="rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[11px]">
                              <option value="proposed">proposed</option>
                              <option value="approved">approved</option>
                              <option value="declined">declined</option>
                            </select>
                            <button className="rounded-full bg-[var(--gold-bg)] px-2 py-0.5 text-[11px] text-[var(--gold)]">save</button>
                          </form>
                        </div>
                        <Heart trackId={track.id} count={heartsForTrack} mine={mineFor(track.id)} />
                        <form action={removeTrack.bind(null, track.id)}>
                          <button className="text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" title="Remove" aria-label="Remove song">Remove</button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
