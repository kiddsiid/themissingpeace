// The public wedding website (/w/[slug]) — styled by the couple's own Master Vision mood.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadPublicPage } from '@/lib/guest-page/public';

export default async function GuestHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPublicPage(slug);
  if (!page) notFound();

  return (
    <div className="text-center">
      <span className="dream-twinkle" style={{ left: '8%', top: 10, fontSize: 16 }}>+</span>
      <span className="dream-twinkle" style={{ left: '88%', top: 40, fontSize: 14, animationDelay: '1.2s' }}>+</span>

      <p className="text-[12px] uppercase tracking-[0.3em] text-[var(--gold)]">We're getting married</p>
      <h1 className="voice mt-3 text-5xl md:text-6xl">{page.coupleLine}</h1>
      {page.dateLine && <p className="mt-3 text-sm text-[var(--ink-soft)]">{page.dateLine}</p>}

      {page.showMood && page.mood && (
        <p className="voice mx-auto mt-8 max-w-xl text-lg text-[var(--ink-soft)]">“{page.mood}”</p>
      )}

      {page.welcome && (
        <p className="mx-auto mt-8 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink)]">{page.welcome}</p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {page.rsvpOpen && (
          <Link href={`/w/${page.slug}/rsvp`} className="rounded-full bg-[var(--clay)] px-7 py-2.5 text-sm text-white shadow-sm transition-transform hover:-translate-y-0.5">
            ✦ RSVP
          </Link>
        )}
        {page.photosOpen && (
          <Link href={`/w/${page.slug}/photos`} className="rounded-full border border-[#D8C7A6] px-7 py-2.5 text-sm text-[var(--ink-soft)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--gold-bg)]">
            Share your photos
          </Link>
        )}
      </div>
    </div>
  );
}
