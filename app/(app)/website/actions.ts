'use server';
// Website Studio actions (0013) — the couple's control room for the public guest surface.
import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { suggestSlug, cleanSlug } from '@/lib/guest-page/slug';

async function requireWrite() {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full')) throw new Error('You do not have permission to manage the website');
  return ws;
}

/** Create the page with a slug suggested from the couple's names (uniquified if taken). */
export async function createGuestPage() {
  const ws = await requireWrite();
  const db = supabaseAdmin();
  const { data: existing } = await db.from('guest_pages').select('id').eq('workspace_id', ws.id).maybeSingle();
  if (existing) { revalidatePath('/website'); return; }
  const { data: profile } = await db.from('wedding_profiles').select('partner_one_label, partner_two_label').eq('workspace_id', ws.id).maybeSingle();
  let slug = suggestSlug(profile?.partner_one_label, profile?.partner_two_label);
  const { data: clash } = await db.from('guest_pages').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 62);
  const { error } = await db.from('guest_pages').insert({ workspace_id: ws.id, slug, created_by: ws.userId });
  if (error) throw error;
  revalidatePath('/website');
}

export async function updateGuestPage(formData: FormData) {
  const ws = await requireWrite();
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const rawSlug = formData.get('slug');
  if (typeof rawSlug === 'string' && rawSlug.trim()) {
    const slug = cleanSlug(rawSlug);
    if (!slug) throw new Error('Use lowercase letters, numbers, and dashes for the address');
    const { data: clash } = await db.from('guest_pages').select('workspace_id').eq('slug', slug).maybeSingle();
    if (clash && clash.workspace_id !== ws.id) throw new Error('That address is taken — try another');
    patch.slug = slug;
  }
  const welcome = formData.get('welcome');
  if (typeof welcome === 'string') patch.welcome = welcome.trim().slice(0, 2000) || null;
  patch.rsvp_open = formData.get('rsvp_open') === 'on';
  patch.photos_open = formData.get('photos_open') === 'on';
  patch.show_mood = formData.get('show_mood') === 'on';

  await db.from('guest_pages').update(patch).eq('workspace_id', ws.id);
  revalidatePath('/website');
}

export async function setPublished(formData: FormData) {
  const ws = await requireWrite();
  const publish = formData.get('publish') === 'true';
  await supabaseAdmin().from('guest_pages')
    .update({ is_published: publish, updated_at: new Date().toISOString() })
    .eq('workspace_id', ws.id);
  revalidatePath('/website');
}

/** Hide/show a guest photo in the public album. */
export async function setPhotoHidden(formData: FormData) {
  const ws = await requireWrite();
  const id = formData.get('id');
  const hidden = formData.get('hidden') === 'true';
  if (typeof id !== 'string') return;
  await supabaseAdmin().from('guest_photos').update({ is_hidden: hidden }).eq('workspace_id', ws.id).eq('id', id);
  revalidatePath('/website');
}
