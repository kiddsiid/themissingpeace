// Public guest photo album (/w/[slug]/photos) — guests upload memories straight into
// the couple's private bucket; the album shows everything the couple hasn't hidden.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { signUploads } from '@/lib/supabase/storage';
import { loadPublicPage } from '@/lib/guest-page/public';
import { uploadGuestPhoto } from '@/app/w/actions';

export default async function GuestPhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPublicPage(slug);
  if (!page || !page.photosOpen) notFound();

  const db = supabaseAdmin();
  const { data: photos } = await db
    .from('guest_photos')
    .select('id, upload_id, uploader_name, caption, created_at')
    .eq('workspace_id', page.workspaceId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(120);
  const list = photos ?? [];
  const urls = await signUploads(list.map((p: any) => p.upload_id));

  return (
    <div>
      <p className="text-center text-[12px] uppercase tracking-[0.3em] text-[var(--gold)]">{page.coupleLine}</p>
      <h1 className="voice mt-2 text-center text-4xl">The album we make together</h1>
      <p className="mt-2 text-center text-sm text-[var(--ink-soft)]">Add the moments you caught — they become part of the story.</p>

      <form action={uploadGuestPhoto} className="mx-auto mt-6 flex max-w-xl flex-wrap items-center gap-2 rounded-[16px] border border-dashed border-[#D8C7A6] bg-[var(--pearl)] p-3">
        <input type="hidden" name="slug" value={slug} />
        <input name="uploader_name" placeholder="Your name" className="w-32 flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
        <input name="caption" placeholder="A caption (optional)" className="w-40 flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
        <input type="file" name="file" accept="image/*" required className="text-xs text-[var(--ink-soft)]" />
        <button className="rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">⬆ Share</button>
      </form>

      {list.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[var(--ink-faint)]">No photos yet — be the first to add one.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 items-start gap-3 sm:grid-cols-3">
          {list.map((p: any) => {
            const u = urls.get(p.upload_id);
            if (!u?.url) return null;
            return (
              <figure key={p.id} className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-white shadow-sm">
                <img src={u.url} alt={p.caption ?? ''} className="w-full object-cover" />
                {(p.caption || p.uploader_name) && (
                  <figcaption className="px-3 py-2 text-xs text-[var(--ink-soft)]">
                    {p.caption}{p.caption && p.uploader_name ? ' — ' : ''}{p.uploader_name && <span className="text-[var(--ink-faint)]">{p.uploader_name}</span>}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center">
        <Link href={`/w/${slug}`} className="text-sm text-[var(--ink-faint)] underline-offset-2 hover:underline">← back to the celebration</Link>
      </p>
    </div>
  );
}
