'use server';
// Guest CRM actions (Build Plan v2 §13). Membership + plan.full enforced.
import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { markGuestOutputsStale } from '@/app/(app)/outputs/actions';

async function requireWrite() {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full')) throw new Error('You do not have permission to edit the guest list');
  return ws;
}
function text(fd: FormData, k: string) { const v = fd.get(k); return typeof v === 'string' && v.trim() ? v.trim() : null; }
function on(fd: FormData, k: string) { return fd.get(k) === 'on'; }

export async function createHousehold(fd: FormData) {
  const ws = await requireWrite();
  const name = text(fd, 'name');
  if (!name) throw new Error('Household name is required');
  const { error } = await supabaseAdmin().from('households').insert({
    workspace_id: ws.id, name, address: text(fd, 'address'), relationship_group: text(fd, 'relationship_group'),
    primary_contact: text(fd, 'primary_contact'), invitation_status: text(fd, 'invitation_status'), created_by: ws.userId,
  });
  if (error) throw error;
  await markGuestOutputsStale(ws.id);
  revalidatePath('/guests');
}

export async function deleteHousehold(fd: FormData) {
  const ws = await requireWrite();
  const id = text(fd, 'id'); if (!id) throw new Error('Household required');
  await supabaseAdmin().from('households').delete().eq('id', id).eq('workspace_id', ws.id);
  await markGuestOutputsStale(ws.id);
  revalidatePath('/guests');
}

export async function createGuest(fd: FormData) {
  const ws = await requireWrite();
  const first = text(fd, 'first_name');
  if (!first) throw new Error('Guest first name is required');
  const { error } = await supabaseAdmin().from('guests').insert({
    workspace_id: ws.id,
    household_id: text(fd, 'household_id'),
    first_name: first,
    last_name: text(fd, 'last_name'),
    email: text(fd, 'email'),
    phone: text(fd, 'phone'),
    relationship: text(fd, 'relationship'),
    preferred_name: text(fd, 'preferred_name'),
    pronouns: text(fd, 'pronouns'),
    guest_group: text(fd, 'guest_group'),
    hotel_status: text(fd, 'hotel_status'),
    invited_rehearsal: on(fd, 'invited_rehearsal'),
    invited_other_events: on(fd, 'invited_other_events'),
    transportation_need: on(fd, 'transportation_need'),
    is_child: on(fd, 'is_child'),
    plus_one_eligible: on(fd, 'plus_one_eligible'),
    plus_one_name: text(fd, 'plus_one_name'),
    invited_ceremony: on(fd, 'invited_ceremony'),
    invited_reception: on(fd, 'invited_reception'),
    meal_choice: text(fd, 'meal_choice'),
    dietary: text(fd, 'dietary'),
    accessibility: text(fd, 'accessibility'),
    traveling_from: text(fd, 'traveling_from'),
    song_request: text(fd, 'song_request'),
    created_by: ws.userId,
  });
  if (error) throw error;
  await markGuestOutputsStale(ws.id);
  revalidatePath('/guests');
}

export async function updateGuestRsvp(fd: FormData) {
  const ws = await requireWrite();
  const id = text(fd, 'id'); const rsvp = text(fd, 'rsvp_status');
  if (!id || !rsvp) throw new Error('Guest and RSVP required');
  await supabaseAdmin().from('guests').update({
    rsvp_status: rsvp,
    meal_choice: text(fd, 'meal_choice'),
    hotel_status: text(fd, 'hotel_status'),
    thank_you_note_status: text(fd, 'thank_you_note_status'),
    gift_received: on(fd, 'gift_received'),
  }).eq('id', id).eq('workspace_id', ws.id);
  await markGuestOutputsStale(ws.id);
  revalidatePath('/guests');
}

export async function deleteGuest(fd: FormData) {
  const ws = await requireWrite();
  const id = text(fd, 'id'); if (!id) throw new Error('Guest required');
  await supabaseAdmin().from('guests').delete().eq('id', id).eq('workspace_id', ws.id);
  await markGuestOutputsStale(ws.id);
  revalidatePath('/guests');
}

// A guest's song request → the playlist (dance floor), keeping who asked for it.
export async function sendSongToPlaylist(fd: FormData) {
  const ws = await requireWrite();
  const id = text(fd, 'id'); if (!id) throw new Error('Guest required');
  const db = supabaseAdmin();
  const { data: g } = await db.from('guests').select('first_name, last_name, song_request').eq('id', id).eq('workspace_id', ws.id).maybeSingle();
  if (!g?.song_request) return;
  const who = [g.first_name, g.last_name].filter(Boolean).join(' ');
  await db.from('playlist_tracks').insert({
    workspace_id: ws.id, moment: 'party', title: g.song_request, source: 'other',
    note: `requested by ${who}`, added_by: ws.userId,
  });
  revalidatePath('/playlist');
  revalidatePath('/guests');
}
