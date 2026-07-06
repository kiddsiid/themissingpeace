// Website Studio — configure and publish the public guest surface (/w/[slug]).
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { signUploads } from '@/lib/supabase/storage';
import { createGuestPage, updateGuestPage, setPublished, setPhotoHidden } from './actions';

export default async function WebsitePage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();

  const { data: page } = await db
    .from('guest_pages')
    .select('slug, is_published, welcome, rsvp_open, photos_open, show_mood')
    .eq('workspace_id', ws.id)
    .maybeSingle();

  if (!page) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The face your guests see</p>
        <h1 className="voice text-4xl">Your Wedding Website</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          One beautiful public page: your names, your date, the mood of your Master Vision — with RSVP
          that writes straight into your guest list, and an album your guests fill for you.
        </p>
        <form action={createGuestPage} className="mt-5">
          <button className="rounded-full bg-[var(--clay)] px-6 py-2.5 text-sm text-white shadow-sm transition-transform hover:-translate-y-0.5">✦ Create our page</button>
        </form>
      </div>
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const url = (path = '') => `${base}/w/${page.slug}${path}`;

  const { data: photos } = await db
    .from('guest_photos')
    .select('id, upload_id, uploader_name, caption, is_hidden')
    .eq('workspace_id', ws.id)
    .order('created_at', { ascending: false })
    .limit(60);
  const photoList = photos ?? [];
  const urls = await signUploads(photoList.map((p: any) => p.upload_id));

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The face your guests see</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="voice text-4xl">Your Wedding Website</h1>
        <form action={setPublished}>
          <input type="hidden" name="publish" value={page.is_published ? 'false' : 'true'} />
          <button className={'rounded-full px-5 py-2 text-sm shadow-sm transition-transform hover:-translate-y-0.5 ' + (page.is_published ? 'border border-[var(--line)] text-[var(--ink-soft)]' : 'bg-[var(--sage)] text-white')}>
            {page.is_published ? 'Unpublish' : '✦ Publish'}
          </button>
        </form>
      </div>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        {page.is_published
          ? <>Live now — share it with your circle.</>
          : <>Not published yet. Guests will see nothing until you publish.</>}
      </p>

      <div className="mt-4 rounded-[16px] border border-[var(--line)] bg-[var(--gold-bg)] p-4 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Share these links</p>
        <div className="mt-2 space-y-1">
          <p><span className="text-[var(--ink-faint)]">Website · </span><a className="underline underline-offset-2" href={url()} target="_blank">{url()}</a></p>
          <p><span className="text-[var(--ink-faint)]">RSVP · </span><a className="underline underline-offset-2" href={url('/rsvp')} target="_blank">{url('/rsvp')}</a> <span className="text-[var(--ink-faint)]">(also collects addresses — your contact-collector magic link)</span></p>
          <p><span className="text-[var(--ink-faint)]">Photo album · </span><a className="underline underline-offset-2" href={url('/photos')} target="_blank">{url('/photos')}</a></p>
        </div>
      </div>

      <form action={updateGuestPage} className="mt-5 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[var(--ink-soft)]">
            Page address
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-[var(--ink-faint)]">/w/</span>
              <input name="slug" defaultValue={page.slug} className="w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            </div>
          </label>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="rsvp_open" defaultChecked={page.rsvp_open} /> RSVP open</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="photos_open" defaultChecked={page.photos_open} /> Guest photo uploads open</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="show_mood" defaultChecked={page.show_mood} /> Show our Master Vision mood line</label>
          </div>
        </div>
        <label className="mt-4 block text-sm text-[var(--ink-soft)]">
          Welcome message
          <textarea name="welcome" defaultValue={page.welcome ?? ''} rows={4} placeholder="Tell your people what this day means to you…" className="mt-1 w-full rounded-[14px] border border-[var(--line)] bg-white px-4 py-3 text-sm" />
        </label>
        <button className="mt-4 rounded-full bg-[var(--clay)] px-6 py-2 text-sm text-white">Save</button>
      </form>

      <section className="mt-7">
        <h2 className="voice text-2xl">Guest album <span className="text-xs text-[var(--ink-faint)]">· {photoList.length}</span></h2>
        {photoList.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--ink-faint)]">Nothing yet — once guests add photos, curate them here.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 items-start gap-3 sm:grid-cols-4">
            {photoList.map((p: any) => {
              const u = urls.get(p.upload_id);
              return (
                <figure key={p.id} className={'overflow-hidden rounded-[12px] border border-[var(--line)] bg-white ' + (p.is_hidden ? 'opacity-40' : '')}>
                  {u?.url && <img src={u.url} alt="" className="h-28 w-full object-cover" />}
                  <figcaption className="flex items-center justify-between px-2 py-1.5 text-[11px] text-[var(--ink-soft)]">
                    <span className="truncate">{p.uploader_name ?? 'A guest'}</span>
                    <form action={setPhotoHidden}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="hidden" value={p.is_hidden ? 'false' : 'true'} />
                      <button className="text-[var(--ink-faint)] hover:text-[var(--clay-ink)]">{p.is_hidden ? 'show' : 'hide'}</button>
                    </form>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
