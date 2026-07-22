'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { can } from '@/lib/auth/permissions';
import type { MemberRole } from '@/lib/types';
import type {
  CanvasContext,
  FeastBoard,
  FeastCourse,
  FeastDish,
  FeastRestriction,
  GuestCoverage,
} from '@/lib/canvas/types';
import { setDishBlessed, setRestrictionVerified } from './actions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  food: FeastBoard;
  context: CanvasContext;
  workspaceRole: MemberRole;
}

type Layout = 'studio' | 'journey' | 'focus';
type CoverStatus = 'covered' | 'needs_review' | 'conflict';
type ReadyStatus = 'empty' | 'in_progress' | 'needs_review' | 'ready';

const COST_LABEL: Record<FeastDish['cost'], string> = {
  gentle: 'Gentle',
  moderate: 'Moderate',
  higher: 'Higher',
};
const COST_PER_GUEST: Record<FeastDish['cost'], number> = { gentle: 8, moderate: 16, higher: 28 };

const PRESENCE_COLORS = ['#BC7459', '#7C93A6', '#8A9A80'];

// Some guest-restriction labels are satisfied by a differently-worded dish tag.
const SATISFY_SYNONYMS: Record<string, string[]> = {
  'Nut allergy': ['Nut free'],
  Halal: ['Halal', 'Zabiha'],
};
// Labels with no structured dish equivalent are treated as broadly servable.
const NEUTRAL_LABELS = new Set(['Low spice', 'Kid friendly']);

function dishSatisfies(dish: FeastDish, label: string): boolean {
  if (NEUTRAL_LABELS.has(label)) return true;
  if (dish.restrictions.includes(label)) return true;
  const syn = SATISFY_SYNONYMS[label];
  return !!syn && syn.some((s) => dish.restrictions.includes(s));
}

// ---------------------------------------------------------------------------
// Status palettes (mapped onto the app's CSS-variable tokens)
// ---------------------------------------------------------------------------
function coverMeta(s: CoverStatus) {
  switch (s) {
    case 'covered':
      return { label: 'Covered', color: 'var(--sage)', bg: 'var(--sage-bg)' };
    case 'needs_review':
      return { label: 'Needs review', color: 'var(--gold)', bg: 'var(--gold-bg)' };
    default:
      return { label: 'Conflict', color: 'var(--clay-ink)', bg: 'var(--clay-bg)' };
  }
}

function readyMeta(s: ReadyStatus) {
  switch (s) {
    case 'ready':
      return { label: 'Blessed & ready', color: 'var(--sage)', bg: 'var(--sage-bg)' };
    case 'needs_review':
      return { label: 'Needs guest review', color: 'var(--gold)', bg: 'var(--gold-bg)' };
    case 'in_progress':
      return { label: 'In progress', color: 'var(--clay-ink)', bg: 'var(--clay-bg)' };
    default:
      return { label: 'Still quiet', color: 'var(--ink-soft)', bg: '#EEE9E0' };
  }
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------
function courseReadiness(course: FeastCourse, restrictions: FeastRestriction[]): ReadyStatus {
  const dishes = course.dishes ?? [];
  if (dishes.length === 0) return 'empty';
  const unverified = new Set(
    restrictions.filter((r) => r.verify && !r.verified).map((r) => r.label),
  );
  const hasReviewGap = dishes.some((d) => d.restrictions.some((l) => unverified.has(l)));
  if (dishes.every((d) => d.blessed)) return hasReviewGap ? 'needs_review' : 'ready';
  return hasReviewGap ? 'needs_review' : 'in_progress';
}

interface GroupView {
  group: GuestCoverage;
  status: CoverStatus;
  note: string;
}

function coverageFor(
  courses: FeastCourse[],
  restrictions: FeastRestriction[],
  coverage: GuestCoverage[],
): GroupView[] {
  const allDishes = courses.flatMap((c) => c.dishes ?? []);
  return coverage.map((group) => {
    const serving = allDishes.filter((d) => group.restrictions.every((l) => dishSatisfies(d, l)));
    if (serving.length === 0) {
      return {
        group,
        status: 'conflict',
        note: `No dish currently serves ${group.restrictions.join(' + ')}. Add a safe option with its own prep and labeling.`,
      };
    }
    const needVerify = restrictions.filter((r) => group.restrictions.includes(r.label) && r.verify);
    const allVerified = needVerify.every((r) => r.verified);
    const anyBlessed = serving.some((d) => d.blessed);
    if (!allVerified) {
      const pending = needVerify.filter((r) => !r.verified).map((r) => r.label);
      return {
        group,
        status: 'needs_review',
        note: `${serving.length} dish${serving.length > 1 ? 'es' : ''} can serve this guest — still verifying ${pending.join(', ')} with the caterer.`,
      };
    }
    if (!anyBlessed) {
      return {
        group,
        status: 'needs_review',
        note: 'A safe path exists and is verified — bless a serving dish to close the loop.',
      };
    }
    return {
      group,
      status: 'covered',
      note: 'A verified, blessed dish welcomes this guest across the meal.',
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FeastStudio({ food, context, workspaceRole }: Props) {
  const canEdit = can(workspaceRole, 'plan.full');
  const [, startTransition] = useTransition();

  // Local, prop-seeded state for immediate UI; server actions persist.
  const [courses, setCourses] = useState<FeastCourse[]>(food.courses);
  const [restrictions, setRestrictions] = useState<FeastRestriction[]>(food.restrictions);
  const [activeId, setActiveId] = useState<string>(food.courses[0]?.id ?? '');
  const [layout, setLayout] = useState<Layout>('studio');
  const [panelOpen, setPanelOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [intention, setIntention] = useState(
    'A warm, generous, family-style feast at one long shared table.',
  );
  const [vw, setVw] = useState(1440);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeCourse = courses.find((c) => c.id === activeId) ?? courses[0];

  // ---- derived --------------------------------------------------------------
  const groupViews = useMemo(
    () => coverageFor(courses, restrictions, food.guestCoverage),
    [courses, restrictions, food.guestCoverage],
  );

  const covCounts = useMemo(() => {
    const c = { covered: 0, needs_review: 0, conflict: 0 } as Record<CoverStatus, number>;
    groupViews.forEach((g) => { c[g.status] += 1; });
    return c;
  }, [groupViews]);

  const allDishes = useMemo(() => courses.flatMap((c) => c.dishes ?? []), [courses]);
  const blessedCount = allDishes.filter((d) => d.blessed).length;
  const verifyNeeded = restrictions.filter((r) => r.verify);
  const verifiedCount = verifyNeeded.filter((r) => r.verified).length;

  const total = groupViews.length || 1;
  const coverageComponent = (covCounts.covered + 0.5 * covCounts.needs_review) / total;
  const verifiedFrac = verifyNeeded.length ? verifiedCount / verifyNeeded.length : 1;
  const blessedFrac = allDishes.length ? blessedCount / allDishes.length : 0;
  const score = Math.round((coverageComponent * 0.5 + verifiedFrac * 0.25 + blessedFrac * 0.25) * 100);
  const hospitalityLabel =
    score >= 95 ? 'Fully welcoming'
      : score >= 80 ? 'Warmly inclusive'
        : score >= 60 ? 'Generous, with gaps'
          : 'Still building';
  const hospitalitySummary = `The meal is generous and coherent. ${covCounts.conflict} care conflict${covCounts.conflict === 1 ? '' : 's'} and ${covCounts.needs_review} requirement${covCounts.needs_review === 1 ? '' : 's'} still need attention before the caterer brief is ready.`;

  const briefPct = allDishes.length ? Math.round((blessedCount / allDishes.length) * 100) : 0;

  // next action
  const conflictGroup = groupViews.find((g) => g.status === 'conflict');
  const reviewRestriction = verifyNeeded.find((r) => !r.verified);
  const emptyCourse = courses.find((c) => (c.dishes ?? []).length === 0);
  const nextAction = (() => {
    if (conflictGroup) {
      const home = courses.find((c) => (c.dishes ?? []).some((d) => !dishSatisfies(d, conflictGroup.group.restrictions[0])));
      return {
        title: `Close the ${conflictGroup.group.guestType.toLowerCase()} gap`,
        why: conflictGroup.note,
        cta: home ? `Open ${home.name}` : 'Open the meal',
        onClick: () => home && setActiveId(home.id),
      };
    }
    if (reviewRestriction) {
      const home = courses.find((c) => (c.dishes ?? []).some((d) => d.restrictions.includes(reviewRestriction.label)));
      return {
        title: `Verify ${reviewRestriction.label.toLowerCase()} with the caterer`,
        why: `${reviewRestriction.label} — ${reviewRestriction.notes}. Confirm the source, then mark it verified so the dishes that rely on it can be trusted.`,
        cta: home ? `Open ${home.name}` : 'Open guest care',
        onClick: () => home && setActiveId(home.id),
      };
    }
    if (emptyCourse) {
      return {
        title: `Fill ${emptyCourse.name}`,
        why: 'Guest care is in strong shape. A later moment is still quiet before the sendoff.',
        cta: `Open ${emptyCourse.name}`,
        onClick: () => setActiveId(emptyCourse.id),
      };
    }
    return {
      title: 'Bless the meal',
      why: 'Every requirement is covered. Bless the remaining dishes to hand a confident brief to the caterer.',
      cta: 'Review dishes',
      onClick: () => setActiveId(courses[0]?.id ?? ''),
    };
  })();

  // cost guidance
  const perGuest = allDishes.reduce((sum, d) => sum + COST_PER_GUEST[d.cost], 0);
  const costLow = Math.round(perGuest * 0.85);
  const costHigh = Math.round(perGuest * 1.1);
  const higherDishes = allDishes.filter((d) => d.cost === 'higher').map((d) => d.name);

  // ---- responsive geometry --------------------------------------------------
  const focus = layout === 'focus';
  const journey = layout === 'journey';
  const narrow = vw < 1240;
  const panelInline = !focus && !narrow;
  const showPanelOverlay = !panelInline && panelOpen;
  const showFab = !panelInline && !panelOpen;

  const gridCols = focus
    ? '84px minmax(0,1fr)'
    : narrow
      ? '210px minmax(0,1fr)'
      : journey
        ? '212px minmax(0,1fr) 330px'
        : '266px minmax(0,1fr) 350px';

  const displayCourses = journey ? courses : activeCourse ? [activeCourse] : [];

  // ---- actions --------------------------------------------------------------
  const toggleDish = (courseId: string, dishId: string) => {
    if (!canEdit) return;
    let next = false;
    setCourses((prev) =>
      prev.map((c) =>
        c.id !== courseId
          ? c
          : {
            ...c,
            dishes: c.dishes.map((d) => {
              if (d.id !== dishId) return d;
              next = !d.blessed;
              return { ...d, blessed: next };
            }),
          },
      ),
    );
    startTransition(() => { void setDishBlessed(courseId, dishId, next); });
  };

  const toggleRestriction = (restrictionId: string) => {
    if (!canEdit) return;
    let next = false;
    setRestrictions((prev) =>
      prev.map((r) => {
        if (r.id !== restrictionId) return r;
        next = !r.verified;
        return { ...r, verified: next };
      }),
    );
    startTransition(() => { void setRestrictionVerified(restrictionId, next); });
  };

  // ---------------------------------------------------------------------------
  return (
    <div
      className="feast-root -mx-6 -my-6 flex min-h-screen flex-col md:-mx-10"
      style={{ background: 'var(--cream)', color: 'var(--ink)' }}
    >
      <style>{`
        @keyframes feast-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes feast-fade{from{opacity:0}to{opacity:1}}
        @keyframes feast-sheet{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .feast-card{animation:feast-rise .42s cubic-bezier(.22,1,.36,1) both}
        .feast-scroll{min-height:0;overflow-y:auto}
        @media(prefers-reduced-motion:reduce){.feast-root *{animation:none!important}}
      `}</style>

      {/* GLOBAL HEADER */}
      <header
        className="flex h-[60px] flex-shrink-0 items-center justify-between gap-4 px-[22px]"
        style={{ background: 'var(--pearl)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/peace-center" className="voice whitespace-nowrap text-[22px] font-semibold text-[var(--ink)]">
            The Missing Peace
          </Link>
          <div className="h-[22px] w-px" style={{ background: 'var(--line)' }} />
          <div className="flex min-w-0 flex-col leading-[1.1]">
            <span className="truncate text-[13px] font-semibold text-[var(--ink)]">{context.projectName}</span>
            <span className="text-[10px] uppercase tracking-[1.4px] text-[var(--gold)]">The Feast Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-[14px]">
          <span
            className="flex items-center gap-[7px] whitespace-nowrap rounded-full px-3 py-[5px] text-[11.5px]"
            style={{ color: 'var(--sage)', background: 'var(--sage-bg)', border: '1px solid rgba(138,154,128,0.4)' }}
          >
            <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: 'var(--sage)' }} />
            Saved
          </span>
          <div className="flex items-center">
            {context.approverRoles.slice(0, 3).map((role, i) => (
              <div
                key={role}
                title={role}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-[11px] font-bold text-[#FFFDFC]"
                style={{ background: PRESENCE_COLORS[i % PRESENCE_COLORS.length], borderColor: 'var(--pearl)', marginLeft: i ? -8 : 0 }}
              >
                {role.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CONTEXTUAL BAR */}
      <div
        className="flex flex-shrink-0 items-center justify-between gap-[14px] px-[22px] py-[9px]"
        style={{ background: '#FBF8F2', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex min-w-0 items-center gap-[10px]">
          <span className="voice whitespace-nowrap text-[18px] font-semibold text-[var(--ink)]">Feast Studio</span>
          <span className="hidden truncate text-[11px] text-[var(--ink-soft)] sm:inline">
            · {food.style === 'family' ? 'Family-style' : food.serviceFeeling} · {courses.length} moments · {hospitalityLabel}
          </span>
        </div>
        <div className="flex items-center gap-[10px]">
          <div
            className="flex items-center gap-[2px] rounded-[10px] p-[3px]"
            style={{ background: '#F1EADD', border: '1px solid var(--line)' }}
          >
            {(['studio', 'journey', 'focus'] as Layout[]).map((id) => {
              const on = layout === id;
              const labels: Record<Layout, string> = { studio: 'Studio', journey: 'Journey', focus: 'Focus' };
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setLayout(id); setPanelOpen(false); }}
                  className="cursor-pointer rounded-[8px] px-3 py-[6px] text-[11.5px] font-semibold"
                  style={{
                    color: on ? 'var(--ink)' : 'var(--ink-soft)',
                    background: on ? 'var(--pearl)' : 'transparent',
                    boxShadow: on ? '0 1px 3px rgba(58,54,49,0.12)' : 'none',
                    border: 'none',
                  }}
                >
                  {labels[id]}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setBriefOpen(true)}
            className="inline-flex cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[10px] px-[14px] py-[8px] text-[12.5px] font-semibold text-[#FFFDFC]"
            style={{ background: 'var(--gold)', border: '1px solid #9a7a3d' }}
          >
            Caterer brief · {briefPct}%
          </button>
        </div>
      </div>

      {/* COMPACT FEAST HEADER */}
      <div
        className="flex flex-shrink-0 items-stretch gap-5 px-[22px] py-4"
        style={{ background: 'linear-gradient(180deg,#FBF6EC 0%,var(--cream) 100%)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="text-[10.5px] uppercase tracking-[2px] text-[var(--gold)]">Turn the Compass into a meal</div>
          <div className="voice text-[clamp(24px,3.4vw,34px)] font-semibold leading-[1.02] text-[var(--ink)]">
            Build a meal every guest can enter.
          </div>
          <div className="mt-[2px] flex max-w-[560px] items-center gap-2">
            <span className="voice flex-shrink-0 text-[16px] italic text-[var(--ink-soft)]">Intention</span>
            <input
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              aria-label="Meal intention"
              className="voice min-w-0 flex-1 bg-transparent text-[16px] italic text-[var(--ink)] outline-none"
              style={{ border: 'none', borderBottom: '1px solid rgba(58,54,49,0.2)', padding: '3px 2px' }}
            />
          </div>
          <div className="mt-[6px] flex flex-wrap gap-[7px]">
            {[
              { k: 'Meal shape', v: food.style === 'family' ? 'Family-style feast' : food.serviceFeeling },
              { k: 'Season', v: context.season },
              { k: 'Bar', v: food.moments.cocktail ? 'Signatures + mocktails' : 'Simple bar' },
              { k: 'Guest care', v: hospitalityLabel },
            ].map((c) => (
              <div
                key={c.k}
                className="inline-flex items-center gap-[6px] rounded-full px-[11px] py-[5px] text-[11.5px]"
                style={{ background: 'var(--pearl)', border: '1px solid var(--line)', color: '#3a352f' }}
              >
                <span className="text-[10px] uppercase tracking-[0.8px] text-[var(--gold)]">{c.k}</span>
                <span className="font-semibold">{c.v}</span>
              </div>
            ))}
          </div>
        </div>
        {!narrow && (
          <div
            className="flex w-[290px] flex-shrink-0 flex-col gap-[2px] rounded-[14px] px-4 py-[14px]"
            style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}
          >
            <div className="mb-[6px] text-[10px] uppercase tracking-[1.6px] text-[var(--gold)]">Feast Compass</div>
            {[
              { k: 'Meal shape', v: 'One long shared table', c: 'var(--ink)' },
              { k: 'Guest care', v: hospitalityLabel, c: score >= 80 ? 'var(--sage)' : 'var(--gold)' },
              { k: 'Emotional root', v: food.emotionalRoot, c: 'var(--ink)' },
              { k: 'Next', v: covCounts.conflict ? 'Resolve a conflict' : 'Confirm sources', c: 'var(--clay-ink)' },
            ].map((r, i, arr) => (
              <div
                key={r.k}
                className="flex items-center justify-between gap-[10px] py-[6px]"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(58,54,49,0.08)' : 'none' }}
              >
                <span className="text-[12px] text-[var(--ink-soft)]">{r.k}</span>
                <span className="text-right text-[12.5px] font-semibold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WORKSPACE */}
      <div
        className="grid flex-1"
        style={{ gridTemplateColumns: gridCols, minHeight: 0, background: 'var(--line)', gap: 1 }}
      >
        {/* LEFT · FEAST MAP */}
        <aside className="feast-scroll" style={{ background: '#FBF8F2', padding: focus ? '14px 10px' : '16px 14px' }}>
          {!focus && (
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[1.6px] text-[var(--gold)]">Feast Map</div>
              <div className="text-[10px] text-[var(--ink-soft)]">
                {courses.filter((c) => courseReadiness(c, restrictions) === 'ready').length}/{courses.length} ready
              </div>
            </div>
          )}
          <div className="flex flex-col gap-[7px]">
            {courses.map((s, idx) => {
              const rm = readyMeta(courseReadiness(s, restrictions));
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  aria-label={`${s.name}, ${rm.label}, ${(s.dishes ?? []).length} dishes`}
                  className="flex w-full cursor-pointer items-center gap-[10px] text-left"
                  style={{
                    padding: focus ? '8px' : '9px 10px',
                    borderRadius: 11,
                    border: `1px solid ${active ? 'rgba(184,146,74,0.5)' : 'var(--line)'}`,
                    background: active ? '#FBF6EC' : 'var(--pearl)',
                    justifyContent: focus ? 'center' : 'flex-start',
                  }}
                >
                  <div
                    className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[8px] text-[12px] font-semibold"
                    style={{ color: active ? '#FFFDFC' : 'var(--ink-soft)', background: active ? 'var(--gold)' : '#F1EADD' }}
                  >
                    {idx + 1}
                  </div>
                  {!focus && (
                    <>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{s.name}</div>
                        <div className="truncate text-[10.5px] text-[var(--ink-soft)]">
                          {s.timing.split(' · ')[0]} · {s.service} · {s.mood}
                        </div>
                      </div>
                      <div className="h-[9px] w-[9px] flex-shrink-0 rounded-full" style={{ background: rm.color }} title={rm.label} />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER · TASTING CANVAS */}
        <main
          className="feast-scroll"
          style={{ background: 'var(--cream)', padding: journey ? '18px 22px' : '22px clamp(20px,3vw,40px) 40px' }}
        >
          {displayCourses.map((course) => {
            const rm = readyMeta(courseReadiness(course, restrictions));
            const dishes = course.dishes ?? [];
            return (
              <section
                key={course.id}
                className="feast-card"
                style={{ background: 'var(--pearl)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', marginBottom: journey ? 14 : 0 }}
              >
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-[14px] font-semibold text-[#FFFDFC]"
                      style={{ background: 'var(--gold)' }}
                    >
                      {courses.findIndex((c) => c.id === course.id) + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="voice text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.05] text-[var(--ink)]">{course.name}</div>
                      <div className="mt-[1px] text-[11.5px] text-[var(--ink-soft)]">{course.timing} · {course.service}</div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-[9px]">
                    <span
                      className="whitespace-nowrap rounded-full px-[11px] py-[4px] text-[10.5px] font-semibold"
                      style={{ color: rm.color, background: rm.bg }}
                    >
                      {rm.label}
                    </span>
                    <span className="text-[11px] text-[var(--ink-soft)]">{dishes.length} dish{dishes.length === 1 ? '' : 'es'}</span>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-[2px]">
                  <div className="voice my-[4px] mb-[14px] max-w-[640px] text-[16px] italic leading-[1.4] text-[var(--ink-soft)]">
                    {course.scene}
                  </div>

                  {/* service meta */}
                  <div className="mb-[14px] grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
                    {[
                      { k: 'Service', v: course.service },
                      { k: 'Staffing', v: course.staffing },
                      { k: 'Rentals', v: course.rental },
                    ].map((m) => (
                      <div key={m.k}>
                        <div className="mb-[3px] text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">{m.k}</div>
                        <div className="text-[12.5px] leading-[1.4] text-[#3a352f]">{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* dishes */}
                  <div className="flex flex-col gap-[10px]">
                    {dishes.map((dish) => (
                      <DishCard
                        key={dish.id}
                        dish={dish}
                        restrictions={restrictions}
                        canEdit={canEdit}
                        onBless={() => toggleDish(course.id, dish.id)}
                      />
                    ))}
                    {dishes.length === 0 && (
                      <div
                        className="rounded-[14px] p-[22px] text-center"
                        style={{ border: '1.5px dashed rgba(58,54,49,0.18)', background: '#FCFAF5' }}
                      >
                        <div className="voice text-[16px] italic text-[var(--ink-soft)]">This moment is still quiet.</div>
                        <div className="mt-[2px] text-[11.5px] text-[var(--ink-faint)]">Leave it intentionally still, or add a dish when it&apos;s ready.</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </main>

        {/* RIGHT · PEACE PANEL (inline) */}
        {panelInline && (
          <aside className="feast-scroll" style={{ background: '#FBF8F2', padding: '18px 16px' }}>
            <PeacePanel
              score={score}
              hospitalityLabel={hospitalityLabel}
              hospitalitySummary={hospitalitySummary}
              covCounts={covCounts}
              groupViews={groupViews}
              restrictions={restrictions}
              canEdit={canEdit}
              onToggleRestriction={toggleRestriction}
              nextAction={nextAction}
              costRange={`$${costLow}–${costHigh} / guest`}
              costDrivers={higherDishes.length ? `Driven by ${higherDishes.join(', ')}.` : 'Driven by a generous, seasonal family-style meal.'}
              briefPct={briefPct}
            />
          </aside>
        )}
      </div>

      {/* PEACE PANEL (overlay) */}
      {showPanelOverlay && (
        <div className="fixed inset-0 z-[45] flex justify-end" style={{ background: 'rgba(58,54,49,0.34)', animation: 'feast-fade .2s ease both' }} onClick={() => setPanelOpen(false)}>
          <aside
            className="feast-scroll"
            style={{ width: 'min(380px,92vw)', background: '#FBF8F2', boxShadow: '-16px 0 50px rgba(58,54,49,0.22)', padding: '18px 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="voice text-[18px] font-semibold text-[var(--ink)]">Peace Panel</span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close insights"
                className="h-[30px] w-[30px] cursor-pointer rounded-[8px] text-[15px] text-[var(--ink)]"
                style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}
              >
                ✕
              </button>
            </div>
            <PeacePanel
              score={score}
              hospitalityLabel={hospitalityLabel}
              hospitalitySummary={hospitalitySummary}
              covCounts={covCounts}
              groupViews={groupViews}
              restrictions={restrictions}
              canEdit={canEdit}
              onToggleRestriction={toggleRestriction}
              nextAction={nextAction}
              costRange={`$${costLow}–${costHigh} / guest`}
              costDrivers={higherDishes.length ? `Driven by ${higherDishes.join(', ')}.` : 'Driven by a generous, seasonal family-style meal.'}
              briefPct={briefPct}
            />
          </aside>
        </div>
      )}

      {/* FLOATING INSIGHTS FAB */}
      {showFab && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex cursor-pointer items-center gap-2 rounded-full px-[18px] py-3 text-[12.5px] font-semibold text-[#F7F4EE]"
          style={{ background: 'var(--ink)', boxShadow: '0 10px 30px rgba(58,54,49,0.28)', border: 'none' }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--gold)' }} />
          Insights · {covCounts.conflict + covCounts.needs_review} open
        </button>
      )}

      {/* CATERER BRIEF MODAL */}
      {briefOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          style={{ background: 'rgba(58,54,49,0.4)', animation: 'feast-fade .2s ease both' }}
          onClick={() => setBriefOpen(false)}
        >
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: 'min(680px,100%)', maxHeight: '88vh', background: 'var(--pearl)', borderRadius: 18, boxShadow: '0 30px 70px rgba(58,54,49,0.32)', animation: 'feast-sheet .3s cubic-bezier(.22,1,.36,1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-start justify-between gap-[14px] px-6 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <div className="text-[10px] uppercase tracking-[1.6px] text-[var(--gold)]">Caterer brief · live projection</div>
                <div className="voice mt-[2px] text-[26px] font-semibold leading-[1.05] text-[var(--ink)]">{context.projectName}</div>
                <div className="mt-[3px] text-[11.5px] text-[var(--ink-soft)]">
                  Generated from {allDishes.length} dishes across {courses.length} moments · {briefPct}% blessed
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBriefOpen(false)}
                aria-label="Close brief"
                className="h-9 w-9 flex-shrink-0 cursor-pointer rounded-[10px] text-[16px] text-[var(--ink)]"
                style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}
              >
                ✕
              </button>
            </div>
            <div className="feast-scroll flex-1 px-6 py-5">
              {[
                { title: 'Event facts', body: `${context.season} · ${courses.length} moments · one long shared table · ${food.bar}.`, ok: true },
                { title: 'Meal intention', body: intention, ok: true },
                { title: 'Service sequence', body: `${courses.map((c) => c.name).join(' → ')}.`, ok: true },
                { title: 'Guest requirements', body: `${groupViews.length} guest groups. ${covCounts.conflict} conflicts, ${covCounts.needs_review} need review, ${covCounts.covered} covered.`, ok: covCounts.conflict === 0 },
                { title: 'Preparation protocols', body: food.notes, ok: covCounts.conflict === 0 },
                { title: 'Open questions', body: verifyNeeded.filter((r) => !r.verified).map((r) => r.label).join(', ') || 'None — all sources verified.', ok: verifiedCount === verifyNeeded.length && covCounts.conflict === 0 },
              ].map((b) => (
                <div key={b.title} className="py-3" style={{ borderBottom: '1px solid rgba(58,54,49,0.08)' }}>
                  <div className="flex items-center justify-between gap-[10px]">
                    <span className="text-[11px] uppercase tracking-[1.2px] text-[var(--gold)]">{b.title}</span>
                    <span
                      className="rounded-full px-[9px] py-[3px] text-[10px] font-semibold"
                      style={{ color: b.ok ? 'var(--sage)' : 'var(--gold)', background: b.ok ? 'var(--sage-bg)' : 'var(--gold-bg)' }}
                    >
                      {b.ok ? 'Ready' : 'Open'}
                    </span>
                  </div>
                  <div className="mt-[5px] text-[13px] leading-[1.5] text-[#3a352f]">{b.body}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-shrink-0 items-center justify-between gap-[10px] px-6 py-[14px]" style={{ borderTop: '1px solid var(--line)', background: '#FBF8F2' }}>
              <span className="text-[11px] text-[var(--ink-faint)]">Private · not shared with vendors automatically</span>
              <button
                type="button"
                onClick={() => setBriefOpen(false)}
                className="cursor-pointer rounded-[9px] px-4 py-[9px] text-[12px] font-semibold text-[#FFFDFC]"
                style={{ background: 'var(--gold)', border: 'none' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dish card
// ---------------------------------------------------------------------------
function DishCard({
  dish,
  restrictions,
  canEdit,
  onBless,
}: {
  dish: FeastDish;
  restrictions: FeastRestriction[];
  canEdit: boolean;
  onBless: () => void;
}) {
  const verifiedByLabel = useMemo(() => {
    const m = new Map<string, FeastRestriction>();
    restrictions.forEach((r) => m.set(r.label, r));
    return m;
  }, [restrictions]);

  const chipMeta = (label: string) => {
    const r = verifiedByLabel.get(label);
    if (r && r.verify && !r.verified) return { color: 'var(--gold)', bg: 'var(--gold-bg)' };
    return { color: 'var(--sage)', bg: 'var(--sage-bg)' };
  };

  const borderColor = dish.blessed ? 'var(--sage)' : 'var(--gold)';

  return (
    <div
      style={{ background: 'var(--pearl)', border: '1px solid var(--line)', borderLeft: `3px solid ${borderColor}`, borderRadius: 13, padding: '13px 15px' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-[9px]">
            <span className="voice text-[19px] font-semibold text-[var(--ink)]">{dish.name}</span>
            <span className="text-[11px] text-[var(--ink-soft)]">{COST_LABEL[dish.cost]} cost</span>
          </div>
          <div className="mt-[7px] flex flex-wrap gap-[5px]">
            {dish.restrictions.map((label) => {
              const cm = chipMeta(label);
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[10.5px] font-medium"
                  style={{ color: cm.color, background: cm.bg }}
                >
                  <span className="h-[6px] w-[6px] rounded-full" style={{ background: cm.color }} />
                  {label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-[6px]">
          <span
            className="whitespace-nowrap rounded-full px-[10px] py-[4px] text-[10.5px] font-semibold"
            style={{
              color: dish.blessed ? 'var(--sage)' : 'var(--gold)',
              background: dish.blessed ? 'var(--sage-bg)' : 'var(--gold-bg)',
            }}
          >
            {dish.blessed ? 'Blessed ✦' : 'Not yet blessed'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-[10px] pt-3" style={{ borderTop: '1px solid var(--line)' }}>
        {dish.story && (
          <div className="voice text-[15px] italic leading-[1.45] text-[#3a352f]">{dish.story}</div>
        )}
        <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          <div>
            <div className="mb-[3px] text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">On the plate</div>
            <div className="text-[12.5px] leading-[1.4] text-[#3a352f]">{dish.plate}</div>
          </div>
          <div>
            <div className="mb-[3px] text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">Compliance</div>
            <div className="text-[12.5px] leading-[1.4] text-[#3a352f]">{dish.compliance}</div>
          </div>
        </div>
        <div>
          <div className="mb-[3px] text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">Execution note</div>
          <div className="text-[12.5px] leading-[1.4] text-[#3a352f]">{dish.execution}</div>
        </div>
        <div className="mt-[2px] flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBless}
            disabled={!canEdit}
            className="cursor-pointer rounded-[8px] px-[13px] py-[7px] text-[11.5px] font-semibold"
            style={
              dish.blessed
                ? { color: 'var(--ink-soft)', background: 'var(--pearl)', border: '1px solid var(--line)', opacity: canEdit ? 1 : 0.55 }
                : { color: '#FFFDFC', background: 'var(--sage)', border: 'none', opacity: canEdit ? 1 : 0.55 }
            }
          >
            {dish.blessed ? 'Unbless' : 'Bless this dish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Peace Panel
// ---------------------------------------------------------------------------
function PeacePanel({
  score,
  hospitalityLabel,
  hospitalitySummary,
  covCounts,
  groupViews,
  restrictions,
  canEdit,
  onToggleRestriction,
  nextAction,
  costRange,
  costDrivers,
  briefPct,
}: {
  score: number;
  hospitalityLabel: string;
  hospitalitySummary: string;
  covCounts: Record<CoverStatus, number>;
  groupViews: GroupView[];
  restrictions: FeastRestriction[];
  canEdit: boolean;
  onToggleRestriction: (id: string) => void;
  nextAction: { title: string; why: string; cta: string; onClick: () => void };
  costRange: string;
  costDrivers: string;
  briefPct: number;
}) {
  const ringDeg = Math.round(score * 3.6);
  const ringColor = score >= 80 ? 'var(--sage)' : 'var(--gold)';
  const verifyNeeded = restrictions.filter((r) => r.verify);

  return (
    <>
      {/* Hospitality meter */}
      <div className="flex items-center gap-[14px] rounded-[14px] p-[14px]" style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}>
        <div
          className="flex h-[66px] w-[66px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${ringColor} ${ringDeg}deg, #EEE9E0 ${ringDeg}deg)` }}
        >
          <div className="voice flex h-[52px] w-[52px] items-center justify-center rounded-full text-[17px] font-semibold text-[var(--ink)]" style={{ background: 'var(--pearl)' }}>
            {score}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">Guest care</div>
          <div className="voice text-[19px] font-semibold leading-[1.1] text-[var(--ink)]">{hospitalityLabel}</div>
        </div>
      </div>
      <div className="mx-[2px] mt-[10px] text-[12px] leading-[1.5] text-[var(--ink-soft)]">{hospitalitySummary}</div>

      {/* Guest coverage */}
      <div className="mt-4">
        <div className="mb-2 text-[10px] uppercase tracking-[1.4px] text-[var(--gold)]">Guest care coverage</div>
        <div className="mb-[10px] grid grid-cols-3 gap-[7px]">
          {[
            { n: covCounts.covered, label: 'Covered', c: 'var(--sage)', bg: 'var(--sage-bg)' },
            { n: covCounts.needs_review, label: 'Needs review', c: 'var(--gold)', bg: 'var(--gold-bg)' },
            { n: covCounts.conflict, label: 'Conflict', c: 'var(--clay-ink)', bg: 'var(--clay-bg)' },
          ].map((s) => (
            <div key={s.label} className="rounded-[11px] p-[9px] text-center" style={{ background: s.bg }}>
              <div className="voice text-[20px] font-semibold" style={{ color: s.c }}>{s.n}</div>
              <div className="text-[10px] text-[var(--ink-soft)]">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[7px]">
          {groupViews.map(({ group, status, note }) => {
            const m = coverMeta(status);
            return (
              <div
                key={group.id}
                className="rounded-[10px] px-[11px] py-[10px]"
                style={{ background: 'var(--pearl)', border: '1px solid var(--line)', borderLeft: `3px solid ${m.color}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-[7px]">
                    <span className="text-[12.5px] font-semibold text-[var(--ink)]">{group.icon} {group.guestType}</span>
                  </div>
                  <span
                    className="flex-shrink-0 whitespace-nowrap rounded-full px-[9px] py-[3px] text-[10px] font-semibold"
                    style={{ color: m.color, background: m.bg }}
                  >
                    {m.label}
                  </span>
                </div>
                <div className="mt-[5px] text-[11px] leading-[1.45] text-[var(--ink-soft)]">{note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verify with the caterer */}
      <div className="mt-4">
        <div className="mb-2 text-[10px] uppercase tracking-[1.4px] text-[var(--gold)]">Verify with the caterer</div>
        <div className="flex flex-col gap-[6px]">
          {verifyNeeded.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-[10px] px-[11px] py-[9px]"
              style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}
            >
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[var(--ink)]">{r.label}</div>
                <div className="truncate text-[10.5px] text-[var(--ink-soft)]">{r.notes}</div>
              </div>
              <button
                type="button"
                onClick={() => onToggleRestriction(r.id)}
                disabled={!canEdit}
                className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full px-[10px] py-[5px] text-[10.5px] font-semibold"
                style={
                  r.verified
                    ? { color: 'var(--sage)', background: 'var(--sage-bg)', border: '1px solid rgba(138,154,128,0.4)', opacity: canEdit ? 1 : 0.6 }
                    : { color: 'var(--gold)', background: 'var(--gold-bg)', border: '1px solid rgba(184,146,74,0.35)', opacity: canEdit ? 1 : 0.6 }
                }
              >
                {r.verified ? 'Verified ✓' : 'Mark verified'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Next action */}
      <div className="mt-4 rounded-[14px] px-[15px] py-[14px]" style={{ background: 'linear-gradient(180deg,#2A2621,var(--ink))', color: 'var(--cream)' }}>
        <div className="mb-[5px] text-[10px] uppercase tracking-[1.4px]" style={{ color: 'var(--gold)' }}>Next action</div>
        <div className="voice text-[19px] font-semibold leading-[1.1]">{nextAction.title}</div>
        <div className="mt-[6px] text-[11.5px] leading-[1.5]" style={{ color: 'rgba(247,244,238,0.72)' }}>{nextAction.why}</div>
        <button
          type="button"
          onClick={nextAction.onClick}
          className="mt-[11px] cursor-pointer rounded-[9px] px-[14px] py-2 text-[12px] font-semibold text-[var(--ink)]"
          style={{ background: 'var(--gold)', border: 'none' }}
        >
          {nextAction.cta}
        </button>
      </div>

      {/* Cost + brief readiness */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-[12px] p-3" style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">Cost guidance</span>
            <span className="text-[9.5px] text-[var(--ink-faint)]">Advisory</span>
          </div>
          <div className="voice mt-[3px] text-[22px] font-semibold text-[var(--ink)]">{costRange}</div>
          <div className="mt-[2px] text-[11px] text-[var(--ink-soft)]">{costDrivers}</div>
        </div>
        <div className="rounded-[12px] p-3" style={{ background: 'var(--pearl)', border: '1px solid var(--line)' }}>
          <div className="mb-[7px] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[1.2px] text-[var(--gold)]">Brief readiness</span>
            <span className="text-[12px] font-semibold text-[var(--ink)]">{briefPct}%</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full" style={{ background: '#EEE9E0' }}>
            <div className="h-full rounded-full" style={{ width: `${briefPct}%`, background: 'linear-gradient(90deg,var(--gold),#e0c069)' }} />
          </div>
          <div className="mt-[6px] text-[11px] text-[var(--ink-soft)]">
            {covCounts.conflict} conflict{covCounts.conflict === 1 ? '' : 's'} · {covCounts.needs_review} to review before handoff
          </div>
        </div>
      </div>
    </>
  );
}
