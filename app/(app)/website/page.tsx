// Website Studio — configure and publish the public guest surface (/w/[slug]).
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { signUploads } from '@/lib/supabase/storage';
import { createGuestPage, updateGuestPage, setPublished, setPhotoHidden } from './actions';
import { outputSourceHash, regenerateOutput } from '@/app/(app)/outputs/actions';
import { staleOutput } from '@/lib/outputs/freshness';

async function PrivateGuestExperience({ workspaceId }: { workspaceId: string }) {
  const db = supabaseAdmin();
  const [compassRes, atmosphereRes, latestPreviewRes, currentHash] = await Promise.all([
    db.from('wedding_compass').select('summary, tone').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('atmosphere_plans').select('palette_json').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('output_versions').select('source_hash, is_stale, version').eq('workspace_id', workspaceId).eq('output_kind', 'guest-experience').order('version', { ascending: false }).limit(1).maybeSingle(),
    outputSourceHash(workspaceId, 'guest-experience'),
  ]);
  const isStale = staleOutput(currentHash, latestPreviewRes.data);
  const palette = atmosphereRes.data?.palette_json as { primary?: string } | null;
  return (
    <section className="mb-8 rounded-[18px] border border-[var(--gold)] bg-[var(--pearl)] p-5" aria-label="Private Guest Experience preview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">Private preview · not published</p>
          <h2 className="voice mt-1 text-2xl">Guest Experience</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${isStale ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'bg-[var(--sage-bg)] text-[var(--ink)]'}`}>
          {!latestPreviewRes.data ? 'Draft not generated' : isStale ? 'Update available' : `Current · v${latestPreviewRes.data.version}`}
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--line)]" style={{ background: palette?.primary || 'var(--cream)' }}>
        <div className="bg-[rgba(255,253,249,.9)] p-6 text-center backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">A private look at the world your guests will enter</p>
          <p className="voice mx-auto mt-3 max-w-xl text-2xl leading-snug text-[var(--ink)]">{compassRes.data?.summary || 'Your Compass story will appear here.'}</p>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">{compassRes.data?.tone || 'Warm, personal, and connected to the plan.'}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-5 text-[var(--ink-soft)]">This preview has no public URL and does not activate publishing. It is sourced from the Compass and Atmosphere plan.</p>
        <form action={regenerateOutput}>
          <input type="hidden" name="kind" value="guest-experience" />
          <button className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs text-[var(--pearl)]">
            {!latestPreviewRes.data ? 'Generate private draft' : 'Create updated version'}
          </button>
        </form>
      </div>
    </section>
  );
}

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
      <div className="mx-auto max-w-4xl">
        <PrivateGuestExperience workspaceId={ws.id} />
        <div className="text-center">
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
      <PrivateGuestExperience workspaceId={ws.id} />
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
