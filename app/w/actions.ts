'use server';
// PUBLIC guest actions (/w/[slug]) — no auth; every write is gated on a published page
// with the matching feature open, and touches only guest-owned fields. The RSVP flow
// doubles as the contact collector (Joy's magic link): the party can update its own
// address while responding.
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadPublicPage } from '@/lib/guest-page/public';

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 400) : null;
}

/** Submit RSVPs for a whole party (household or single guest). */
export async function submitRsvp(formData: FormData) {
  const slug = text(formData, 'slug');
  if (!slug) throw new Error('Missing page');
  const page = await loadPublicPage(slug);
  if (!page || !page.rsvpOpen) throw new Error('RSVP is not open');
  const db = supabaseAdmin();

  const guestIds = formData.getAll('guest_id').map(String).slice(0, 20);
  for (const gid of guestIds) {
    const status = text(formData, `rsvp_${gid}`);
    if (!status || !['accepted', 'declined'].includes(status)) continue;
    // Scope every write to this workspace's guests — a foreign id can't cross over.
    await db.from('guests').update({
      rsvp_status: status,
      meal_choice: text(formData, `meal_${gid}`),
      dietary: text(formData, `dietary_${gid}`),
      song_request: text(formData, `song_${gid}`),
    }).eq('workspace_id', page.workspaceId).eq('id', gid);
  }

  // Contact collector: the party may update its household address.
  const householdId = text(formData, 'household_id');
  const address = text(formData, 'address');
  if (householdId && address) {
    await db.from('households').update({ address }).eq('workspace_id', page.workspaceId).eq('id', householdId);
  }
  revalidatePath(`/w/${slug}/rsvp`);
}

/** Form entry point: save the party's response, then show the thank-you state. */
export async function submitRsvpAndThank(formData: FormData) {
  const slug = text(formData, 'slug');
  await submitRsvp(formData);
  redirect(`/w/${slug}/rsvp?sent=1`);
}

/** Guest photo upload — image only, small, straight into the couple's private bucket. */
export async function uploadGuestPhoto(formData: FormData) {
  const slug = text(formData, 'slug');
  if (!slug) throw new Error('Missing page');
  const page = await loadPublicPage(slug);
  if (!page || !page.photosOpen) throw new Error('Photo uploads are not open');

  const file = formData.get('file');
  if (!(file instanceof File) || !file.size) throw new Error('Choose a photo');
  if (!file.type.startsWith('image/')) throw new Error('Images only');
  if (file.size > 8 * 1024 * 1024) throw new Error('Photos up to 8MB, please');

  const db = supabaseAdmin();
  const safe = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${page.workspaceId}/guest-album/${randomUUID()}-${safe}`;
  const { error } = await db.storage.from('uploads').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data: up, error: e2 } = await db.from('uploads').insert({
    workspace_id: page.workspaceId, bucket: 'uploads', path, mime: file.type, size: file.size,
  }).select('id').single();
  if (e2) throw e2;
  await db.from('guest_photos').insert({
    workspace_id: page.workspaceId,
    upload_id: up!.id,
    uploader_name: text(formData, 'uploader_name'),
    caption: text(formData, 'caption'),
  });
  revalidatePath(`/w/${slug}/photos`);
}
