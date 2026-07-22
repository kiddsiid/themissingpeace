'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { DreamCloud } from '@/design-system/DreamCloud';

/* The Missing Peace — homepage, rebuilt from the Claude Design "Homepage" artifact.
   A storybook landing: radiant doorway hero, a Chapter One card, One Engine · Four
   Layers, the Dream-Cloud Compass, and the closing Weaver vow. Warm palette + the
   existing DreamCloud / arch / twinkle motifs. */

const rise = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

function Sparkle({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className={'pointer-events-none absolute text-[var(--gold)] ' + className}
      style={{ animation: 'twinkle-soft 4s ease-in-out infinite', ...style }}
    >
      ✦
    </span>
  );
}

const LAYERS = [
  { n: '01', name: 'Dream', body: 'What the day should feel like — a ceremonial walk of quiet choices.' },
  { n: '02', name: 'Compass', body: 'A woven poetic sentence and Dream Clouds every room reads from.' },
  { n: '03', name: 'Engine', body: 'The one next action, the one watch item, five readiness dimensions.' },
  { n: '04', name: 'World', body: 'Feast, atmosphere, atelier, guests, timeline — the practical dream.' },
] as const;

type Tone = 'blush' | 'sage' | 'clay' | 'gold' | 'sky';
const CLOUDS: {
  eyebrow: string; label: string; status: string; tone: Tone;
  style: React.CSSProperties;
}[] = [
  { eyebrow: 'What it means', label: 'Memory & photos', status: 'Held close', tone: 'blush', style: { left: '30%', top: '30%' } },
  { eyebrow: 'Our people', label: 'Family & our people', status: 'North Star', tone: 'sage', style: { left: '50%', top: '10%' } },
  { eyebrow: 'The feeling', label: 'Warmth over show', status: 'Held close', tone: 'clay', style: { left: '70%', top: '30%' } },
  { eyebrow: 'A boundary', label: 'Ease & calm', status: 'Held close', tone: 'sage', style: { left: '24%', top: '52%' } },
  { eyebrow: 'Hospitality', label: 'A shared table', status: 'Held close', tone: 'gold', style: { left: '76%', top: '52%' } },
  { eyebrow: 'Aesthetic', label: 'Soft beauty', status: 'Held high', tone: 'blush', style: { left: '38%', top: '70%' } },
  { eyebrow: 'Atmosphere', label: 'Music & dancing', status: 'Held high', tone: 'sky', style: { left: '62%', top: '70%' } },
];

export function HomeLanding() {
  const reduce = useReducedMotion();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--cream)] text-[var(--ink)]">
      {/* Nav */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-baseline gap-3">
          <span className="voice text-lg text-[var(--ink)]">The Missing Peace</span>
          <span className="hidden text-[10px] uppercase tracking-[0.28em] text-[var(--ink-faint)] sm:inline">
            Wedding Planning Engine
          </span>
        </div>
        <span className="text-xs text-[var(--gold)]">Free to dream ✦</span>
      </header>

      {/* ───────────── Hero: the radiant doorway ───────────── */}
      <section className="relative px-6 pb-24 pt-10">
        <div className="hero-rays" />
        <div className="hero-glow" />
        {/* nested arch */}
        <div className="dream-arch" style={{ top: 40, width: 460, height: 540, borderRadius: '230px 230px 30px 30px' }} />
        <div className="dream-arch" style={{ top: 74, width: 360, height: 430, borderRadius: '180px 180px 22px 22px', opacity: 0.4 }} />
        {/* floating clouds */}
        <div className="pointer-events-none absolute left-[6%] top-[26%] opacity-70 md:left-[12%]">
          <DreamCloud tone="pearl" width={150} floatDuration="11s" />
        </div>
        <div className="pointer-events-none absolute right-[6%] top-[20%] opacity-60 md:right-[12%]">
          <DreamCloud tone="pearl" width={120} floatDuration="13s" />
        </div>
        <div className="pointer-events-none absolute bottom-[2%] left-[14%] opacity-60">
          <DreamCloud tone="pearl" width={130} floatDuration="12s" />
        </div>
        <Sparkle className="text-base" style={{ left: '18%', top: 90 }} />
        <Sparkle className="text-xl" style={{ left: '82%', top: 120, animationDelay: '1s' }} />
        <Sparkle className="text-xs" style={{ left: '30%', top: 200, animationDelay: '2s' }} />
        <Sparkle className="text-sm" style={{ left: '72%', top: 260, animationDelay: '.6s' }} />

        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center pt-16 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-[#E4D6B8] bg-white/60 text-[var(--gold)] mp-soft">
            ✦
          </div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--gold)]">Where forever begins</p>
          <h1 className="voice mt-4 text-6xl leading-none text-[var(--ink)] sm:text-7xl">The Missing Peace</h1>
          <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
            Your day · Your people · Your peace
          </p>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[var(--ink-soft)]">
            Before the budget, the guest list, and a thousand decisions — there is a{' '}
            <span className="voice italic text-[var(--ink)]">feeling</span>. Step through the door and we&apos;ll help you
            bottle it.
          </p>

          {/* who's arriving */}
          <div className="mt-9 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
            <RolePill href="/welcome?role=couple" title="A couple" sub="building the day together" />
            <RolePill href="/welcome?role=planner" title="A planner" sub="carrying a couple's dream" />
            <RolePill href="/sign-in" title="Arriving to celebrate" sub="just here to feel it" className="sm:col-span-2 sm:mx-auto sm:w-2/3" />
          </div>
          <p className="mt-6 text-sm text-[var(--ink-faint)]">Choose who&apos;s arriving to open the door.</p>
          <p className="mt-6 text-[11px] text-[var(--gold)]">Free to dream. Invite your person anytime. ✦</p>

          <div className="mt-16 flex flex-col items-center gap-1 text-[var(--ink-faint)]">
            <span className="text-[10px] uppercase tracking-[0.3em]">A peek at what&apos;s inside</span>
            <span aria-hidden className="text-lg" style={reduce ? undefined : { animation: 'dream-cloud-float 2.4s ease-in-out infinite' }}>↓</span>
          </div>
        </div>
      </section>

      {/* ───────────── Chapter One ───────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <motion.article {...rise} className="rounded-[28px] border border-[var(--line)] bg-[var(--pearl)] p-8 sm:p-12 mp-soft">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">Chapter one</p>
          <h2 className="voice mt-4 text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
            The night we agreed to build a world.
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[var(--ink-soft)]">
            <p>
              <span className="voice italic text-[var(--ink)]">There is a room</span> where two people begin to plan a
              life. It is not a spreadsheet. It is not a checklist. It is a moonlit study, and every choice is a small vow
              made twice — once quietly to yourself, and once, out loud, to the person you love.
            </p>
            <p>
              What if the tool you used to plan the day{' '}
              <span className="voice italic text-[var(--ink)]">felt like the day</span>?
            </p>
          </div>
          <div className="mt-8 border-t border-[var(--line)] pt-5">
            <div className="flex items-end justify-between">
              <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">From The Missing Peace</span>
              <span className="voice text-2xl italic text-[var(--gold)]">— for R.</span>
            </div>
          </div>
        </motion.article>
      </section>

      {/* ───────────── One Engine · Four Layers ───────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 text-center">
        <motion.p {...rise} className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">
          One engine · Four layers
        </motion.p>
        <motion.h2 {...rise} className="voice mx-auto mt-5 max-w-3xl text-3xl leading-snug text-[var(--ink)] sm:text-4xl">
          Dream gives it meaning. Compass gives it direction. The Engine gives it intelligence. The World gives you{' '}
          <span className="italic">somewhere beautiful to shape the result.</span>
        </motion.h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.n}
              {...rise}
              transition={{ ...rise.transition, delay: reduce ? 0 : i * 0.08 }}
              className="motion-lift rounded-2xl border border-[var(--line)] bg-[var(--pearl)] p-5 text-left"
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">Layer {l.n}</p>
              <h3 className="voice mt-2 text-2xl text-[var(--ink)]">
                {l.name} <span className="text-[var(--gold)]">✦</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{l.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────────── A peek inside · The Compass ───────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 text-center">
        <motion.p {...rise} className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">
          A peek inside · The Compass
        </motion.p>
        <motion.h2 {...rise} className="voice mt-5 text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
          Every choice, held in the right hand.
        </motion.h2>
        <motion.p {...rise} className="mx-auto mt-4 max-w-xl text-[15px] text-[var(--ink-soft)]">
          Drag a Dream Cloud <span className="voice italic text-[var(--ink)]">closer to the moon</span> to raise it — and
          watch your Wedding Compass rewrite itself, live.
        </motion.p>

        <motion.div {...rise} className="mp-soft mt-10 overflow-hidden rounded-[28px] border border-[var(--line)] bg-gradient-to-b from-[#F7E7D8] to-[#F3ECDD]">
          {/* cloud field */}
          <div className="relative mx-auto h-[520px] w-full max-w-3xl">
            {/* central moon / compass */}
            <div className="absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_38%,#FBF1DA,#EAD6A9)] px-4 text-center mp-soft">
              <span className="text-[9px] uppercase tracking-[0.24em] text-[#9A7B3E]">Wedding Compass ✦</span>
              <span className="voice mt-1 text-[13px] italic leading-snug text-[var(--ink)]">
                Rooted in family &amp; our people, lifted by music &amp; dancing.
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[#9A7B3E]">At golden hour</span>
            </div>
            {CLOUDS.map((c) => (
              <div
                key={c.label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={c.style}
              >
                <DreamCloud tone={c.tone} width={148} floatDuration={`${9 + (c.label.length % 5)}s`}>
                  <span className="flex h-full w-full flex-col items-center justify-center px-3 text-center leading-tight">
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">{c.eyebrow}</span>
                    <span className="voice text-[13px] text-[var(--ink)]">{c.label}</span>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[var(--gold)]">{c.status}</span>
                  </span>
                </DreamCloud>
              </div>
            ))}
          </div>
          {/* reads footer */}
          <div className="flex flex-col items-start gap-4 border-t border-[var(--line)] bg-[var(--pearl)]/70 px-6 py-5 text-left sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">Your compass reads</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--ink)]">
                A wedding built around family and the people we love at the center — music and dancing well past midnight,
                and a soft, candlelit, natural beauty.
              </p>
            </div>
            <Link
              href="/welcome"
              className="shrink-0 rounded-full border border-[#D8C7A6] bg-white/70 px-5 py-2.5 text-sm text-[var(--clay-ink)] transition hover:bg-[var(--gold-bg)]"
            >
              Open the full Dream →
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ───────────── Closing: the Weaver vow ───────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-28 pt-12 text-center">
        <motion.p {...rise} className="voice text-xl italic text-[var(--gold)]">
          When it comes time to say what you mean —
        </motion.p>
        <motion.h2 {...rise} className="voice mt-3 text-4xl italic leading-tight text-[var(--ink)] sm:text-5xl">
          the Weaver will help you draft a vow that sounds like you.
        </motion.h2>
        <motion.div {...rise} className="mt-10">
          <Link
            href="/welcome"
            className="inline-block rounded-full border border-[#D8C7A6] bg-white/70 px-8 py-3.5 text-sm text-[var(--clay-ink)] transition hover:bg-[var(--gold-bg)] mp-soft"
          >
            step through the door →
          </Link>
          <p className="mt-5 text-[11px] text-[var(--gold)]">Free to dream · no sign-in ✦</p>
        </motion.div>
      </section>
    </main>
  );
}

function RolePill({
  href,
  title,
  sub,
  className = '',
}: {
  href: string;
  title: string;
  sub: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={
        'motion-lift group flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-[#E4D6BE] bg-white/70 px-6 py-4 text-center transition hover:border-[var(--clay)] hover:bg-[var(--clay-bg)] ' +
        className
      }
    >
      <span className="whitespace-nowrap text-[15px] text-[var(--ink)]">{title}</span>
      <span className="text-[var(--gold)]">✦</span>
      <span className="voice whitespace-nowrap text-sm italic text-[var(--gold)]">{sub}</span>
    </Link>
  );
}
