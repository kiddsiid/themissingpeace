'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { fetchLinkPreview } from '@/lib/link-preview';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import type { PlaylistMoment, TrackSource } from '@/lib/types';

function sourceForUrl(url?: string): TrackSource {
  if (!url) return 'other';
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  if (host.includes('spotify')) return 'spotify';
  if (host.includes('music.apple') || host.includes('itunes.apple')) return 'apple_music';
  if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('soundcloud')) return 'soundcloud';
  return 'other';
}

function splitTitleArtist(raw?: string): { title: string; artist?: string } {
  if (!raw) return { title: 'New song' };
  const cleaned = raw.replace(/\s*\|\s*Spotify.*$/i, '').replace(/\s*-\s*song and lyrics by\s*/i, ' - ');
  const parts = cleaned.split(/\s+-\s+|\s+by\s+/i);
  if (parts.length >= 2) return { title: parts[0].trim(), artist: parts.slice(1).join(' ').trim() };
  return { title: cleaned.trim() };
}

export async function addTrack(formData: FormData) {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'board.add') && !can(ws.role, 'plan.full')) throw new Error('You cannot add songs');
  const db = supabaseAdmin();

  const moment = (String(formData.get('moment') || 'party') as PlaylistMoment);
  const url = String(formData.get('url') || '').trim();
  let title = String(formData.get('title') || '').trim();
  let artist = String(formData.get('artist') || '').trim();
  const note = String(formData.get('note') || '').trim();
  let image: string | undefined;
  let source: TrackSource = 'other';

  if (url) {
    source = sourceForUrl(url);
    if (!title) {
      try {
        const preview = await fetchLinkPreview(url);
        const split = splitTitleArtist(preview.title);
        title = title || split.title;
        artist = artist || split.artist || '';
        image = preview.imageUrl;
      } catch {
        // Manual title fallback below.
      }
    }
  }
  if (!title) title = 'New song';

  await db.from('playlist_tracks').insert({
    workspace_id: ws.id,
    moment,
    title,
    artist: artist || null,
    source,
    source_url: url || null,
    image_url: image ?? null,
    note: note || null,
    added_by: ws.userId,
  });
  await db.from('audit_events').insert({
    workspace_id: ws.id,
    actor_id: ws.userId,
    action: 'playlist_add',
    entity_type: 'playlist_track',
    entity_id: ws.id,
    meta: { title, moment },
  });
  revalidatePath('/playlist');
}

export async function removeTrack(trackId: string) {
  const ws = await requireActiveWorkspace();
  await supabaseAdmin().from('playlist_tracks').delete().eq('id', trackId).eq('workspace_id', ws.id);
  revalidatePath('/playlist');
}

export async function toggleHeart(trackId: string) {
  const ws = await requireActiveWorkspace();
  const db = supabaseAdmin();
  const { data: track } = await db.from('playlist_tracks').select('id').eq('id', trackId).eq('workspace_id', ws.id).maybeSingle();
  if (!track) return;
  const existing = await db.from('playlist_track_hearts').select('track_id').eq('track_id', trackId).eq('user_id', ws.userId).maybeSingle();
  if (existing.data) {
    await db.from('playlist_track_hearts').delete().eq('track_id', trackId).eq('user_id', ws.userId);
  } else {
    await db.from('playlist_track_hearts').insert({ track_id: trackId, user_id: ws.userId });
  }
  revalidatePath('/playlist');
}

export async function setTrackApproval(formData: FormData) {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full') && !can(ws.role, 'board.add')) throw new Error('You cannot set approval');
  const id = String(formData.get('id') || '');
  const status = String(formData.get('approval_status') || 'proposed');
  await supabaseAdmin().from('playlist_tracks').update({ approval_status: status }).eq('id', id).eq('workspace_id', ws.id);
  revalidatePath('/playlist');
}
