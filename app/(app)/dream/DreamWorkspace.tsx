'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { saveDream, saveCloudPriority, approveCompass } from '@/app/(app)/dream/actions';
import type { DreamResponses } from '@/lib/engine/compass';

type Profile = {
  date_status?: string | null; wedding_date?: string | null; planning_stage?: string | null;
  guest_estimate?: number | null; guest_max?: number | null; budget_total?: number | null;
  budget_confidence?: string | null; honeymoon_enabled?: boolean | null;
};
type Compass = { summary?: string | null; tone?: string | null } | null;
type DreamCloud = { id: string; type: string; title: string; summary: string; tags: string[]; grad: string };

const STAGES = ['just_engaged', 'exploring_vision', 'venue_hunting', 'vendor_booking', 'guest_list_building', 'final_details', 'wedding_week', 'post_wedding'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, index) => String(CURRENT_YEAR + index));

function list(values?: string[]) { return values?.join('\n') ?? ''; }
function splitSentence(value?: string) { return value?.split(/[.\n]/).map((i) => i.trim()).filter(Boolean) ?? []; }

function makeClouds(dream: DreamResponses): DreamCloud[] {
  const clouds: DreamCloud[] = [];
  const add = (type: string, title: string, summary: string, tags: string[], grad = 'gp') => {
    if (!title && !summary && !tags.length) return;
    clouds.push({ id: `${type}-${clouds.length}`, type, title: title || tags[0] || type, summary: summary || tags.join(', '), tags, grad });
  };
  add('Feeling', 'The first feeling', dream.partnerOneReflection ?? '', dream.priorities ?? [], 'gp');
  add('Meaning', 'What this day means', dream.sharedMeaning || dream.meaning || '', splitSentence(dream.meaning), 'gg');
  add('Boundary', 'Protected boundaries', dream.partnerTwoReflection ?? '', dream.nonNegotiables ?? [], 'gc');
  add('Avoid', 'Gentle no list', '', dream.avoid ?? [], 'gp');
  add('Tradition', 'Roots and rituals', dream.familyMeaning ?? '', [...(dream.culturalValues ?? []), ...(dream.traditions ?? [])], 'gs');
  add('Hospitality', 'Hospitality', dream.hospitalityMeaning ?? '', [], 'gg');
  add('Atmosphere', 'Atmosphere', dream.musicAtmosphere ?? '', [], 'gp');
  add('Family', 'Family meaning', dream.familyMeaning ?? '', [], 'gs');
  add('Budget', 'Budget philosophy', dream.budgetValues ?? '', [], 'gc');
  if ((dream.priorities ?? []).some((i) => i.toLowerCase().includes('honeymoon'))) add('Honeymoon', 'Forever trip', 'The honeymoon belongs in the Dream.', ['honeymoon'], 'gp');
  return clouds;
}

function GradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true"><defs>
      <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFDF9" /><stop offset="1" stopColor="#F1EBDD" /></linearGradient>
      <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FCF4E0" /><stop offset="1" stopColor="#EEDFBB" /></linearGradient>
      <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2F6ED" /><stop offset="1" stopColor="#DBE5D1" /></linearGradient>
      <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBEAE1" /><stop offset="1" stopColor="#EFCBBA" /></linearGradient>
      {/* Soft cloud shadow baked into the SVG so it never repaints during the float animation. */}
      <filter id="cloudshadow" x="-40%" y="-40%" width="180%" height="190%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#3A3631" floodOpacity="0.16" />
      </filter>
    </defs></svg>
  );
}

// One cloud: the fluffy SVG silhouette + text embedded in its belly. Sparkles show on hover/active.
function CloudFace({ cloud, w }: { cloud: DreamCloud; w: number }) {
  const h = Math.round((w * 170) / 260);
  return (
    <span className="relative block" style={{ width: w, height: h }}>
      <svg viewBox="0 0 260 170" width={w} height={h} preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ overflow: 'visible' }}>
        <g fill={`url(#${cloud.grad})`} filter="url(#cloudshadow)">
          <rect x="24" y="106" width="212" height="40" rx="20" />
          <circle cx="60" cy="106" r="34" /><circle cx="96" cy="82" r="41" /><circle cx="138" cy="64" r="47" />
          <circle cx="184" cy="80" r="41" /><circle cx="216" cy="106" r="30" /><circle cx="120" cy="102" r="45" />
          <circle cx="172" cy="106" r="41" /><circle cx="80" cy="115" r="30" /><circle cx="202" cy="118" r="26" />
        </g>
        <g className="cloud-spark" fill="#C6A44E">
          <path d="M212 44 l1.4 3.8 3.8 1.4 -3.8 1.4 -1.4 3.8 -1.4 -3.8 -3.8 -1.4 3.8 -1.4 Z" />
          <path d="M44 62 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1 Z" />
        </g>
      </svg>
      <span className="absolute flex flex-col items-center justify-center text-center" style={{ top: '34%', left: '13%', right: '13%', bottom: '15%' }}>
        <span className="text-[8px] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{cloud.type}</span>
        <span className="voice mt-0.5 line-clamp-2 text-[15px] leading-[1.1] text-[var(--ink)]">{cloud.title}</span>
        {cloud.summary && <span className="mt-1 line-clamp-1 text-[10px] leading-4 text-[var(--ink-soft)]">{cloud.summary}</span>}
      </span>
    </span>
  );
}

const RXV = [0, 44, 22, 56, 12, 48, 30, 60, 18, 40];   // horizontal orbit-radius jitter (px)
const RYV = [0, 18, 8, 24, 4, 16, 26, 10, 20, 6];      // vertical orbit-radius jitter (px)
const JIT = [-6, 8, -4, 7, -8, 5, -3, 6, -5, 3];       // angle jitter (deg)
const SIZES = [198, 190, 196, 186, 194, 188, 200, 184, 192, 186];

export function DreamWorkspace({ dream, profile, compass, reveal = false }: { dream: DreamResponses; profile: Profile | null; compass: Compass; reveal?: boolean }) {
  const reduce = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false); // true once a drag actually moves — used to swallow the click that follows a drag
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { setScale(Math.max(0.6, Math.min(1, el.clientWidth / 960))); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [, startPriority] = useTransition();
  const [, startApprove] = useTransition();
  const [spark, setSpark] = useState(reveal);
  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => setSpark(false), 2600);
    return () => clearTimeout(t);
  }, [reveal]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approved, setApproved] = useState(!!dream.compassApproved);
  const [editDateStatus, setEditDateStatus] = useState(profile?.date_status ?? 'none');
  const [editDateSeason, setEditDateSeason] = useState(dream.dateSeason ?? 'Spring');
  const [editDateYear, setEditDateYear] = useState(dream.dateYear ?? String(CURRENT_YEAR + 1));
  const [editDesiredYear, setEditDesiredYear] = useState(dream.desiredYear ?? String(CURRENT_YEAR + 1));
  const clouds = useMemo(() => makeClouds(dream), [dream]);
  const selected = clouds.find((c) => c.id === selectedId) ?? null;

  const priorities = dream.cloudPriorities ?? {};
  const layout = useMemo(() => {
    const n = clouds.length || 1;
    return clouds.map((c, i) => {
      const ang = ((-90 + (360 / n) * i + JIT[i % JIT.length]) * Math.PI) / 180;
      const pr = Math.max(0, Math.min(1, priorities[c.id] ?? 0.5)); // 1 = highest priority = closest to Compass
      const rx = 288 + (1 - pr) * 108 + RXV[i % RXV.length] * 0.5;
      const ry = 186 + (1 - pr) * 78 + RYV[i % RYV.length] * 0.5;
      return { dx: Math.round(Math.cos(ang) * rx), dy: Math.round(Math.sin(ang) * ry), w: SIZES[i % SIZES.length], fd: 8 + (i % 5) * 0.6, dl: (i % 4) * 0.5 };
    });
  }, [clouds, dream]);

  const Compass = (
    <div className="flex h-[172px] w-[172px] flex-col items-center justify-center rounded-full p-6 text-center"
      style={{ background: 'radial-gradient(70% 70% at 50% 36%, #FFFDF9, #F5EEE0)', boxShadow: '0 0 0 1px rgba(184,146,74,.16), 0 16px 40px rgba(58,54,49,.09)' }}>
      <p className="text-[8px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Wedding Compass</p>
      <p className="voice mt-1.5 line-clamp-4 text-[13px] leading-[1.25] text-[var(--ink)]">{compass?.summary || 'Your north star will appear here once your Dream is set.'}</p>
      {compass?.summary && (
        <button type="button" onClick={() => { setApproved(true); startApprove(() => { void approveCompass(); }); }} className="mt-3 rounded-full bg-[var(--clay-bg)] px-2.5 py-1 text-[10px] text-[var(--clay-ink)]">{approved ? '✦ approved' : 'Approve'}</button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <GradientDefs />
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Dream Workspace</p>
          <h1 className="voice text-4xl">Your Dream Clouds</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">These are the pieces of meaning that shape your Wedding Compass.</p>
        </div>
        <Link href="/peace-center" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Go to Peace Center</Link>
      </div>

      {clouds.length === 0 ? (
        <div className="mt-6 rounded-[18px] border border-dashed border-[var(--line)] p-10 text-center">
          <p className="voice text-2xl">No clouds yet.</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Open “Edit Dream Details” below to add your reflections.</p>
        </div>
      ) : (
        <>
          {/* Orbit — desktop: the enchanted sky with the Compass at the center */}
          <div ref={sceneRef} className="relative mt-4 hidden overflow-hidden rounded-[22px] lg:block"
            style={{ height: 580, background: 'radial-gradient(120% 90% at 50% 42%, #FBF6EC 0%, #F3ECDE 72%, #EFE7D6 100%)' }}>
            <div className="absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2">{Compass}</div>
            {clouds.map((cloud, i) => {
              const L = layout[i];
              const dx = Math.round(L.dx * scale);
              const dy = Math.round(L.dy * scale);
              const w = Math.round(L.w * (0.82 + 0.18 * scale));
              const h = Math.round((w * 170) / 260);
              return (
                <motion.div key={cloud.id}
                  className="absolute z-10 cursor-grab hover:z-30 active:cursor-grabbing"
                  style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)`, width: w, marginLeft: -w / 2, marginTop: -h / 2 }}
                  drag dragConstraints={sceneRef} dragElastic={0.16} dragMomentum={false} whileDrag={{ scale: 1.05, zIndex: 40 }}
                  onDragStart={() => { draggedRef.current = true; }}
                  onDragEnd={(_e, info) => {
                    const scene = sceneRef.current;
                    if (!scene) return;
                    const r = scene.getBoundingClientRect();
                    const dist = Math.hypot(info.point.x - (r.left + r.width / 2), info.point.y - (r.top + r.height / 2));
                    const pr = Math.max(0, Math.min(1, 1 - dist / (420 * scale)));
                    startPriority(() => { void saveCloudPriority(cloud.id, Number(pr.toFixed(2))); });
                  }}
                >
                  <motion.div
                    initial={reveal && !reduce ? { x: -dx, y: -dy, opacity: 0, scale: 0.8 } : false}
                    animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.9, delay: 0.12 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="dream-float" style={{ ['--fd' as any]: `${L.fd}s`, animationDelay: `${L.dl}s` }}>
                      <button type="button"
                        onPointerDown={() => { draggedRef.current = false; }}
                        onClick={() => { if (draggedRef.current) { draggedRef.current = false; return; } setSelectedId(cloud.id); }}
                        data-open={selectedId === cloud.id ? 'true' : 'false'} data-spark={spark ? 'true' : 'false'} className="dream-cloud w-full">
                        <CloudFace cloud={cloud} w={w} />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile / small screens: the Compass, then a calm stack of clouds */}
          <div className="mt-4 lg:hidden">
            <div className="flex justify-center">{Compass}</div>
            <div className="mt-6 grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2">
              {clouds.map((cloud) => (
                <button key={cloud.id} type="button" onClick={() => setSelectedId(cloud.id)} data-open={selectedId === cloud.id ? 'true' : 'false'} className="dream-cloud">
                  <CloudFace cloud={cloud} w={196} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Detail drawer (slides in from the right) */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedId(null)} />
            <motion.aside
              className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l border-[var(--line)] bg-[var(--pearl)] p-6 shadow-[0_0_60px_rgba(58,54,49,0.18)]"
              initial={reduce ? { opacity: 0 } : { x: '100%' }} animate={reduce ? { opacity: 1 } : { x: 0 }} exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-start justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">{selected.type} Cloud</p>
                <button onClick={() => setSelectedId(null)} aria-label="Close" className="text-[var(--ink-faint)] hover:text-[var(--ink)]">×</button>
              </div>
              <h2 className="voice mt-1 text-3xl">{selected.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{selected.summary || 'This cloud is ready to be shaped.'}</p>
              {selected.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{selected.tags.map((t) => <span key={t} className="rounded-full bg-[var(--cream)] px-2.5 py-0.5 text-[11px] text-[var(--ink-soft)]">{t}</span>)}</div>}
              <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Poof this cloud into</p>
              <div className="mt-2 grid gap-2 text-sm">
                <Link href="/decisions" className="rounded-full bg-[var(--clay-bg)] px-3 py-2 text-center text-[var(--clay-ink)]">A decision</Link>
                <Link href="/budget" className="rounded-full bg-[var(--gold-bg)] px-3 py-2 text-center text-[var(--gold)]">Money Map guidance</Link>
                <Link href="/timeline" className="rounded-full bg-[var(--sage-bg)] px-3 py-2 text-center text-[#566049]">Timeline guidance</Link>
                <Link href="/peace-notes" className="rounded-full border border-[var(--line)] px-3 py-2 text-center text-[var(--ink-soft)]">A Peace Note</Link>
                <a href="#edit-dream" onClick={() => setSelectedId(null)} className="rounded-full px-3 py-2 text-center text-xs text-[var(--ink-faint)] underline">Edit this cloud</a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <details id="edit-dream" className="mt-8 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">Edit Dream Details</summary>
        <form action={saveDream} className="mt-5 grid gap-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <textarea name="partner_one_reflection" rows={3} defaultValue={dream.partnerOneReflection ?? ''} placeholder="Partner reflection" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="partner_two_reflection" rows={3} defaultValue={dream.partnerTwoReflection ?? ''} placeholder="Protected boundary" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="shared_meaning" rows={3} defaultValue={dream.sharedMeaning ?? dream.meaning ?? ''} placeholder="Shared meaning" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm sm:col-span-2" />
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <textarea name="priorities" rows={4} defaultValue={list(dream.priorities)} placeholder="Priorities" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="planning_values" rows={4} defaultValue={list(dream.planningValues)} placeholder="Planning values" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="non_negotiables" rows={4} defaultValue={list(dream.nonNegotiables)} placeholder="Non negotiables" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="avoid" rows={4} defaultValue={list(dream.avoid)} placeholder="Things to avoid" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="cultural_values" rows={4} defaultValue={list(dream.culturalValues)} placeholder="Cultural or spiritual meaning" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <textarea name="traditions" rows={4} defaultValue={list(dream.traditions)} placeholder="Traditions" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <input name="hospitality_meaning" defaultValue={dream.hospitalityMeaning ?? ''} placeholder="Food and hospitality meaning" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="music_atmosphere" defaultValue={dream.musicAtmosphere ?? ''} placeholder="Music and atmosphere" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="family_meaning" defaultValue={dream.familyMeaning ?? ''} placeholder="Family meaning" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="budget_values" defaultValue={dream.budgetValues ?? ''} placeholder="Budget values" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          </section>
          <section className="grid gap-3 sm:grid-cols-3">
            <select name="planning_stage" defaultValue={profile?.planning_stage ?? 'just_engaged'} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">{STAGES.map((stage) => <option key={stage} value={stage}>{stage.replace(/_/g, ' ')}</option>)}</select>
            <select name="date_status" value={editDateStatus} onChange={(event) => setEditDateStatus(event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="none">Date not set</option><option value="known">Known</option><option value="range">Season or range</option></select>
            {editDateStatus === 'known' && <input type="date" name="wedding_date" defaultValue={profile?.wedding_date ?? ''} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />}
            {editDateStatus === 'range' && (
              <>
                <select name="date_season" value={editDateSeason} onChange={(event) => setEditDateSeason(event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">{SEASONS.map((season) => <option key={season} value={season}>{season}</option>)}</select>
                <select name="date_year" value={editDateYear} onChange={(event) => setEditDateYear(event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">{YEARS.map((year) => <option key={year} value={year}>{year}</option>)}</select>
              </>
            )}
            {editDateStatus === 'none' && (
              <select name="desired_year" value={editDesiredYear} onChange={(event) => setEditDesiredYear(event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">{YEARS.map((year) => <option key={year} value={year}>Potential year: {year}</option>)}</select>
            )}
            <input name="guest_estimate" defaultValue={profile?.guest_estimate ?? ''} inputMode="numeric" placeholder="Guest estimate" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <input name="guest_max" defaultValue={profile?.guest_max ?? ''} inputMode="numeric" placeholder="Guest max" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <input name="budget_total" defaultValue={profile?.budget_total ?? ''} inputMode="numeric" placeholder="Budget" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <select name="budget_confidence" defaultValue={profile?.budget_confidence ?? 'unknown'} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="unknown">Still dreaming</option><option value="flexible">Flexible</option><option value="firm">Firm</option></select>
            <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]"><input type="checkbox" name="honeymoon_enabled" defaultChecked={profile?.honeymoon_enabled ?? true} className="accent-[var(--clay)]" /> Honeymoon enabled</label>
          </section>
          <button className="justify-self-end rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">Regenerate Dream Clouds</button>
        </form>
      </details>
    </div>
  );
}
