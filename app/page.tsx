import Link from 'next/link';

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--cream)]">
      <div className="dream-arch" style={{ top: 70, width: 320, height: 380, borderRadius: '160px 160px 24px 24px' }} />
      <div className="dream-arch" style={{ top: 96, width: 250, height: 312, borderRadius: '125px 125px 18px 18px', opacity: 0.45 }} />
      <span className="dream-twinkle" style={{ left: '18%', top: 90, fontSize: 16 }}>+</span>
      <span className="dream-twinkle" style={{ left: '82%', top: 120, fontSize: 20, animationDelay: '1s' }}>+</span>
      <span className="dream-twinkle" style={{ left: '30%', top: 200, fontSize: 12, animationDelay: '2s' }}>+</span>
      <span className="dream-twinkle" style={{ left: '72%', top: 260, fontSize: 14, animationDelay: '.6s' }}>+</span>
      <span className="dream-petal" style={{ left: '24%', top: 320 }} />
      <span className="dream-petal" style={{ left: '76%', top: 350, animationDelay: '2s' }} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
          Your day, your people, your peace
        </p>
        <h1 className="voice mt-3 text-6xl leading-none text-[var(--ink)]">The Missing Peace</h1>
        <p className="voice mt-3 text-2xl text-[var(--ink-soft)]">Where forever begins.</p>
        <p className="mt-4 max-w-md text-sm text-[var(--ink-soft)]">
          A Wedding Planning Engine for the day, the people, the details, and the peace behind it all.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/welcome" className="rounded-full bg-[var(--clay)] px-6 py-3 text-sm text-white hover:opacity-90">
            Begin your Dream
          </Link>
          <Link href="/sign-in" className="rounded-full border border-[#D8C7A6] px-6 py-3 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">
            I already have a Dream
          </Link>
        </div>
        <p className="mt-6 text-[11px] text-[var(--gold)]">Free to dream. Invite your person anytime.</p>
      </div>
    </main>
  );
}
