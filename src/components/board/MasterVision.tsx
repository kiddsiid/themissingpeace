'use client';
// Master Vision (Board Overhaul) — the auto-assembled, approved version of the board.
// Nothing here is manually maintained: every fragment approved on any board flows in,
// grouped under its source board's section. Includes Presentation mode — a polished,
// full-screen concept deck for showing a partner, planner, or family member.
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractMoodAction, saveMoodToCompass } from '@/app/(app)/board/mood';

export interface VisionItem {
  id: string;
  title?: string;
  imageUrl?: string;
  colorHex?: string;
  sourceUrl?: string;
  addedByName?: string;
}
export interface VisionSection {
  boardId: string;
  title: string;
  type: string;
  items: VisionItem[];
}

function sourceDomain(url?: string): string | null {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : null; } catch { return null; }
}

function VisionCard({ item, large = false }: { item: VisionItem; large?: boolean }) {
  const domain = sourceDomain(item.sourceUrl);
  return (
    <figure className={'group overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] shadow-sm transition-transform hover:-translate-y-1 ' + (large ? '' : '')}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title || ''} className={'w-full object-cover ' + (large ? 'max-h-72' : 'max-h-52')} />
      ) : item.colorHex ? (
        <div className={large ? 'h-40' : 'h-24'} style={{ background: item.colorHex }} />
      ) : (
        <div className={'flex items-center justify-center bg-[var(--cream)] text-2xl ' + (large ? 'h-40' : 'h-24')}>✦</div>
      )}
      {(item.title || domain) && (
        <figcaption className="px-3 py-2">
          {item.title && <p className="truncate text-sm text-[var(--ink)]">{item.title}</p>}
          {domain && <p className="text-[11px] text-[var(--ink-faint)]">{domain}</p>}
        </figcaption>
      )}
    </figure>
  );
}

// ─────────────────────────── Presentation mode ───────────────────────────

function PresentDeck({ sections, coupleLine, dateLine, mood, onClose }: {
  sections: VisionSection[]; coupleLine: string; dateLine?: string; mood?: string; onClose: () => void;
}) {
  // Slide 0 = cover; slides 1..n = one per section.
  const slides = sections.length + 1;
  const [idx, setIdx] = useState(0);
  const go = useCallback((d: number) => setIdx((i) => Math.min(slides - 1, Math.max(0, i + d))), [slides]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const section = idx > 0 ? sections[idx - 1] : null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-[var(--cream)] to-[var(--pearl)]">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The Master Vision · presented</p>
        <button onClick={onClose} aria-label="Close presentation" className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Esc · close</button>
      </div>

      <div className="relative flex-1 overflow-hidden" onClick={() => go(1)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto px-8 pb-10"
          >
            {idx === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-[12px] uppercase tracking-[0.3em] text-[var(--gold)]">A wedding vision</p>
                <h1 className="voice mt-3 text-5xl md:text-6xl">{coupleLine}</h1>
                {dateLine && <p className="mt-3 text-sm text-[var(--ink-soft)]">{dateLine}</p>}
                {mood && <p className="voice mt-6 max-w-xl text-lg text-[var(--ink-soft)]">“{mood}”</p>}
                <p className="mt-10 text-[11px] text-[var(--ink-faint)]">→ or click to begin</p>
              </div>
            ) : section ? (
              <div className="mx-auto max-w-5xl">
                <h2 className="voice mt-2 text-center text-4xl">{section.title}</h2>
                <p className="mt-1 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">{section.items.length} approved {section.items.length === 1 ? 'piece' : 'pieces'}</p>
                <div className="mt-6 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
                  {section.items.map((it) => <VisionCard key={it.id} item={it} large />)}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-3 pb-5">
        <button onClick={(e) => { e.stopPropagation(); go(-1); }} disabled={idx === 0} aria-label="Previous" className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--ink-soft)] disabled:opacity-40">←</button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: slides }).map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} aria-label={`Slide ${i + 1}`} className={'h-2 w-2 rounded-full transition-all ' + (i === idx ? 'w-5 bg-[var(--clay)]' : 'bg-[var(--line)] hover:bg-[var(--gold)]')} />
          ))}
        </div>
        <button onClick={(e) => { e.stopPropagation(); go(1); }} disabled={idx === slides - 1} aria-label="Next" className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--ink-soft)] disabled:opacity-40">→</button>
      </div>
    </div>
  );
}

// ─────────────────────────── Master Vision view ───────────────────────────

export function MasterVision({ workspaceId, sections, coupleLine, dateLine, initialMood }: {
  workspaceId: string;
  sections: VisionSection[];
  coupleLine: string;
  dateLine?: string;
  initialMood?: string;
}) {
  const [presenting, setPresenting] = useState(false);
  const [mood, setMood] = useState<string | undefined>(initialMood);
  const [moodSaved, setMoodSaved] = useState(false);
  const [pending, start] = useTransition();
  const total = useMemo(() => sections.reduce((n, s) => n + s.items.length, 0), [sections]);

  function readMood() {
    start(async () => {
      const r = await extractMoodAction(workspaceId);
      if (r.summary) { setMood(r.summary); setMoodSaved(false); }
    });
  }
  function weaveIntoCompass() {
    if (!mood) return;
    start(async () => { await saveMoodToCompass(workspaceId, mood); setMoodSaved(true); });
  }

  if (total === 0) {
    return (
      <div className="mt-8 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--pearl)] p-10 text-center">
        <p className="text-3xl">✦</p>
        <h2 className="voice mt-2 text-2xl">Nothing approved yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-soft)]">
          The Master Vision assembles itself. Approve a fragment on any board — Venue, Florals, Attire, anywhere —
          and it will appear here under its section, automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-soft)]">{total} approved {total === 1 ? 'piece' : 'pieces'} across {sections.length} {sections.length === 1 ? 'section' : 'sections'} — gathered automatically.</p>
        <button onClick={() => setPresenting(true)} className="rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white shadow-sm transition-transform hover:-translate-y-0.5">✦ Present</button>
      </div>

      <div className="mt-4 rounded-[16px] border border-[var(--line)] bg-[var(--gold-bg)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">The mood so far</p>
            {mood
              ? <p className="voice mt-1 text-[15px] text-[var(--ink)]">“{mood}”</p>
              : <p className="mt-1 text-sm text-[var(--ink-soft)]">Let the Peacekeeper read your approved pieces and name the direction they're leaning.</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={readMood} disabled={pending} className="rounded-full border border-[#D8C7A6] px-4 py-1.5 text-sm text-[var(--ink-soft)] hover:bg-white disabled:opacity-60">
              {pending ? 'Reading…' : mood ? 'Read again' : '✨ Read the mood'}
            </button>
            {mood && (
              <button onClick={weaveIntoCompass} disabled={pending || moodSaved} className="rounded-full bg-[var(--sage)] px-4 py-1.5 text-sm text-white disabled:opacity-60">
                {moodSaved ? '✓ Woven in' : 'Weave into Compass'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {sections.map((s, si) => (
          <motion.section
            key={s.boardId}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.06, duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="voice text-2xl">{s.title} <span className="text-xs text-[var(--ink-faint)]">· {s.items.length}</span></h2>
            <div className="mt-3 grid grid-cols-2 items-start gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {s.items.map((it) => <VisionCard key={it.id} item={it} />)}
            </div>
          </motion.section>
        ))}
      </div>

      {presenting && (
        <PresentDeck sections={sections} coupleLine={coupleLine} dateLine={dateLine} mood={mood} onClose={() => setPresenting(false)} />
      )}
    </div>
  );
}
