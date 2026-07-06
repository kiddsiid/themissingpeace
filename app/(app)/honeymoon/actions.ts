'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';

async function requireWrite() {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full')) throw new Error('You do not have permission to plan the honeymoon');
  return ws;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function setHoneymoonEnabled(formData: FormData) {
  const ws = await requireWrite();
  const enabled = formData.get('enabled') === 'true';
  await supabaseAdmin().from('wedding_profiles').update({ honeymoon_enabled: enabled }).eq('workspace_id', ws.id);
  revalidatePath('/honeymoon');
}

export async function saveHoneymoonTrip(formData: FormData) {
  const ws = await requireWrite();
  const db = supabaseAdmin();
  const { error } = await db.from('honeymoon_profiles').upsert({
    workspace_id: ws.id,
    destination: text(formData, 'destination'),
    start_date: text(formData, 'start_date'),
    end_date: text(formData, 'end_date'),
    budget: num(formData, 'budget'),
    status: text(formData, 'status') ?? 'dreaming',
    notes: text(formData, 'notes'),
    created_by: ws.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id' });
  if (error) throw error;
  await db.from('wedding_profiles').update({ honeymoon_enabled: true }).eq('workspace_id', ws.id);
  revalidatePath('/honeymoon');
}

export async function addHoneymoonItem(formData: FormData) {
  const ws = await requireWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Add a name');
  const { error } = await supabaseAdmin().from('honeymoon_items').insert({
    workspace_id: ws.id,
    kind: text(formData, 'kind') ?? 'note',
    title,
    notes: text(formData, 'notes'),
    status: 'idea',
  });
  if (error) throw error;
  revalidatePath('/honeymoon');
}

// Honeymoon activity voting — per-user hearts, mirroring the playlist (0011).
export async function toggleHoneymoonHeart(itemId: string) {
  const ws = await requireActiveWorkspace();
  const db = supabaseAdmin();
  // Confirm the item belongs to this workspace before touching hearts.
  const { data: item } = await db.from('honeymoon_items').select('id').eq('id', itemId).eq('workspace_id', ws.id).maybeSingle();
  if (!item) throw new Error('Item not found');
  const { data: mine } = await db.from('honeymoon_item_hearts').select('honeymoon_item_id').eq('honeymoon_item_id', itemId).eq('user_id', ws.userId).maybeSingle();
  if (mine) {
    await db.from('honeymoon_item_hearts').delete().eq('honeymoon_item_id', itemId).eq('user_id', ws.userId);
  } else {
    await db.from('honeymoon_item_hearts').insert({ honeymoon_item_id: itemId, user_id: ws.userId });
  }
  revalidatePath('/honeymoon');
  return { hearted: !mine };
}

export async function deleteHoneymoonItem(formData: FormData) {
  const ws = await requireWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Item required');
  await supabaseAdmin().from('honeymoon_items').delete().eq('id', id).eq('workspace_id', ws.id);
  revalidatePath('/honeymoon');
}
