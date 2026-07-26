'use client';

/**
 * The Missing Peace — homepage.
 *
 * This is a faithful port of `prototype/Homepage.html`, the design source of
 * truth that shipped to themissingpeace.pages.dev. The markup, copy, section
 * order, atmosphere layers, threshold crossfade and Dream-Cloud Compass are the
 * prototype's. Only three things changed on the way in:
 *
 *   1. The stylesheet is namespaced under `.mp-landing` (ids `mpl-`, keyframes
 *      `mpl-`) so nothing leaks into the app's global CSS. See home-landing.css.
 *   2. Ranking, sizing and the readout sentences come from
 *      `src/lib/landing/compass.ts` — a pure module with unit tests — instead of
 *      being re-derived here.
 *   3. The closing CTA enters the product (`/welcome`) carrying the selected
 *      role, rather than replaying the crossfade as the marketing page did.
 *
 * The `#founding` lead-capture section is deliberately NOT ported: it needs a
 * Next API route and a table. It is logged as a parity ticket.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CLOSE_THRESHOLD,
  CLOUDS,
  DEFAULT_LIGHT,
  DEFAULT_SEASON,
  KEY_STEP,
  LIGHTS,
  SEASONS,
  centre,
  clampPosition,
  cloudAriaLabel,
  cloudMetrics,
  compassShort,
  initialPositions,
  isMobileBoard,
  priority,
  ranked,
  sentence,
  toggleCloud,
  type CloudId,
  type CloudPositions,
} from '@/lib/landing/compass';

import './home-landing.css';

/* ------------------------------------------------------------------ *
 * Deterministic decorative fields.
 * The prototype seeded stars with Math.random(); that would desync SSR
 * from hydration, so the same layout is produced from a fixed sequence.
 * ------------------------------------------------------------------ */

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const STARS = (() => {
  const rand = seeded(20260725);
  return Array.from({ length: 22 }, (_, i) => {
    const size = rand() * 2 + 1;
    return {
      key: `star-${i}`,
      size: Number(size.toFixed(2)),
      left: Number((rand() * 100).toFixed(2)),
      top: Number((rand() * 46).toFixed(2)),
      delay: Number((rand() * 6).toFixed(2)),
    };
  });
})();

const CLOUDFORMS = [
  { x: 6, y: 34, w: 220, o: 0.85, depth: 1 },
  { x: 74, y: 20, w: 150, o: 0.7, depth: 2 },
  { x: 16, y: 78, w: 180, o: 0.6, depth: 1 },
  { x: 60, y: 66, w: 120, o: 0.55, depth: 2 },
  { x: 40, y: 10, w: 110, o: 0.45, depth: 3 },
];

const TWINKLES = Array.from({ length: 12 }, (_, i) => ({
  key: `twinkle-${i}`,
  size: 7 + (i % 4) * 3,
  left: (i * 8.1 + 3) % 96,
  top: (i * 15 + 5) % 90,
  delay: i * 0.3,
}));

const ROLE_NOTES: Record<string, string> = {
  couple: 'Begin with the two of you.',
  dreamer: 'Wander the feeling — nothing to decide yet.',
  planner: "Carry each couple's feeling into every project with the Planner Walk.",
};

/** Board size assumed for the server render; corrected on mount. */
const SSR_BOARD = { width: 1000, height: 620 };

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function HomeLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const dreamwalkRef = useRef<HTMLElement>(null);
  const paperWorldRef = useRef<HTMLDivElement>(null);
  const moonAnchorRef = useRef<HTMLDivElement>(null);
  const mistRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);
  const paperveilRef = useRef<HTMLDivElement>(null);
  const pathARef = useRef<SVGPathElement>(null);
  const pathBRef = useRef<SVGPathElement>(null);
  const crossfadeRef = useRef<HTMLDivElement>(null);
  const wandRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardMoonRef = useRef<HTMLDivElement>(null);

  const [board, setBoard] = useState(SSR_BOARD);
  const [positions, setPositions] = useState<CloudPositions>(() => initialPositions(false));
  const [role, setRole] = useState<string | null>(null);

  const mobile = isMobileBoard(board.width);
  const c0 = useMemo(() => centre(board.width, board.height), [board.width, board.height]);
  const rankedClouds = useMemo(() => ranked(positions), [positions]);
  const longReading = useMemo(() => sentence(positions), [positions]);
  const shortReading = useMemo(() => compassShort(positions), [positions]);
  const light = LIGHTS[DEFAULT_LIGHT];
  const seasonTint = SEASONS[DEFAULT_SEASON];

  const dragRef = useRef<{
    id: CloudId;
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    wasClose: boolean;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<CloudId | null>(null);
  const wasMobileRef = useRef<boolean | null>(null);
  const crossingRef = useRef(false);

  /**
   * Latest positions, readable from document-level pointer handlers and from
   * the memoised callbacks below without making either depend on `positions`.
   * Declared before its first reader so the file reads top-down.
   */
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  /* -------------------- moon pulse -------------------- */
  const moonPulse = useCallback(() => {
    const el = boardMoonRef.current;
    if (!el || prefersReducedMotion()) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }, []);

  /* -------------------- board measurement -------------------- */
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setBoard({ width, height });
      const m = isMobileBoard(width);
      if (wasMobileRef.current === null || m !== wasMobileRef.current) {
        setPositions(initialPositions(m));
      }
      wasMobileRef.current = m;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* -------------------- drag -------------------- */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next = clampPosition(
        { x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) },
        board,
      );
      setPositions((prev) => ({ ...prev, [d.id]: next }));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      const now = positionsRef.current[d.id];
      if (now && !d.wasClose && priority(now) > CLOSE_THRESHOLD) moonPulse();
      dragRef.current = null;
      setDraggingId(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [board, moonPulse]);

  const startDrag = useCallback(
    (id: CloudId, e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const p = positionsRef.current[id];
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* pointer capture is a nicety, not a requirement */
      }
      dragRef.current = {
        id,
        ox: p.x,
        oy: p.y,
        sx: e.clientX,
        sy: e.clientY,
        wasClose: priority(p) > CLOSE_THRESHOLD,
      };
      setDraggingId(id);
    },
    [],
  );

  const onCloudKeyDown = useCallback(
    (id: CloudId, e: React.KeyboardEvent<HTMLDivElement>) => {
      const p = positionsRef.current[id];
      let next = { ...p };
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft':
          next.x -= KEY_STEP;
          break;
        case 'ArrowRight':
          next.x += KEY_STEP;
          break;
        case 'ArrowUp':
          next.y -= KEY_STEP;
          break;
        case 'ArrowDown':
          next.y += KEY_STEP;
          break;
        case 'Enter':
        case ' ': {
          const result = toggleCloud(id, positionsRef.current, mobile);
          next = result.position;
          if (result.pulsed) moonPulse();
          break;
        }
        default:
          handled = false;
      }
      if (!handled) return;
      e.preventDefault();
      setPositions((prev) => ({ ...prev, [id]: clampPosition(next, board) }));
    },
    [board, mobile, moonPulse],
  );

  /* -------------------- reveal on scroll -------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let pending = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
    if (prefersReducedMotion()) {
      pending.forEach((el) => el.classList.add('in'));
      return;
    }
    const check = () => {
      const vh = window.innerHeight;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < vh * 0.9) {
          el.classList.add('in');
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener('scroll', check);
        window.removeEventListener('resize', check);
      }
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  /* -------------------- parallax + dusk → paper -------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.pageYOffset;
        const vh = window.innerHeight;
        if (!reduced) {
          if (moonAnchorRef.current) {
            moonAnchorRef.current.style.transform = `translateY(${y * 0.08}px)`;
          }
          if (mistRef.current) mistRef.current.style.transform = `translateY(${y * -0.06}px)`;
          if (cloudsRef.current) cloudsRef.current.style.transform = `translateY(${y * 0.03}px)`;
        }
        if (dreamwalkRef.current && pathARef.current && pathBRef.current) {
          const top = dreamwalkRef.current.getBoundingClientRect().top;
          const prog = clamp(1 - top / vh, 0, 1);
          pathARef.current.style.strokeOpacity = String(0.4 + prog * 0.5);
          pathBRef.current.style.strokeOpacity = String(0.3 + prog * 0.5);
        }
        if (paperWorldRef.current) {
          const pt = paperWorldRef.current.getBoundingClientRect().top;
          const pprog = clamp(1 - pt / (vh * 0.9), 0, 1);
          if (paperveilRef.current) paperveilRef.current.style.opacity = String(pprog);
          root.classList.toggle('is-paper', pprog > 0.6);
          if (moonAnchorRef.current) {
            moonAnchorRef.current.style.opacity = String(1 - pprog * 0.9);
          }
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* -------------------- drifting cloud forms -------------------- */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const host = cloudsRef.current;
    if (!host) return;
    const nodes = Array.from(host.querySelectorAll<HTMLElement>('.cloudform'));
    const animations = nodes.map((node, i) => {
      const depth = Number(node.dataset.depth ?? 1);
      return node.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(${18 - depth * 4}px)` },
          { transform: 'translateX(0)' },
        ],
        { duration: 26000 + i * 5000, iterations: Infinity, easing: 'ease-in-out' },
      );
    });
    return () => animations.forEach((a) => a.cancel());
  }, []);

  /* -------------------- cursor wand -------------------- */
  useEffect(() => {
    const wand = wandRef.current;
    if (!wand) return;
    if (prefersReducedMotion()) return;
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(pointer: fine)').matches) {
      return;
    }
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let active = false;
    let frame = 0;
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!active) {
        active = true;
        wand.classList.add('on');
        cx = tx;
        cy = ty;
      }
      const target = e.target as Element | null;
      const hot = target?.closest?.('.threshold,.dcloud,.cta,.role,a,button');
      wand.classList.toggle('hot', Boolean(hot));
    };
    const onLeave = () => {
      wand.classList.remove('on');
      active = false;
    };
    const loop = () => {
      cx += (tx - cx) * 0.28;
      cy += (ty - cy) * 0.28;
      wand.style.transform = `translate(${cx}px,${cy}px)`;
      frame = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('mouseleave', onLeave);
    frame = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  /* -------------------- threshold crossfade -------------------- */
  const hoverGlow = useCallback((on: boolean) => {
    if (prefersReducedMotion() || !pathARef.current) return;
    pathARef.current.style.strokeOpacity = on ? '0.85' : '0.5';
    pathARef.current.style.filter = on ? 'blur(24px)' : 'blur(30px)';
  }, []);

  const cross = useCallback(() => {
    if (crossingRef.current) return;
    const target = dreamwalkRef.current;
    if (!target) return;
    crossingRef.current = true;
    if (prefersReducedMotion()) {
      target.scrollIntoView({ behavior: 'auto' });
      crossingRef.current = false;
      return;
    }
    heroRef.current?.classList.add('dissolve');
    crossfadeRef.current?.classList.add('run');
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 620);
    window.setTimeout(() => {
      crossfadeRef.current?.classList.remove('run');
      heroRef.current?.classList.remove('dissolve');
      crossingRef.current = false;
    }, 1650);
  }, []);

  /* -------------------- role selection -------------------- */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('tmp_role');
      if (saved && ROLE_NOTES[saved]) setRole(saved);
    } catch {
      /* private mode — the page works without it */
    }
  }, []);

  const chooseRole = useCallback((next: string) => {
    setRole((prev) => {
      const cleared = prev === next;
      try {
        if (cleared) window.localStorage.removeItem('tmp_role');
        else window.localStorage.setItem('tmp_role', next);
      } catch {
        /* private mode */
      }
      return cleared ? null : next;
    });
  }, []);

  /* -------------------- carry the compass into the app -------------------- */
  useEffect(() => {
    try {
      window.localStorage.setItem(
        'tmp_compass',
        JSON.stringify({
          sentence: longReading,
          tone: shortReading,
          priorities: rankedClouds.slice(0, 4).map((r) => ({
            id: r.cloud.id,
            label: r.cloud.label,
            priority: r.priority,
          })),
          positions,
        }),
      );
    } catch {
      /* private mode */
    }
  }, [longReading, shortReading, rankedClouds, positions]);

  const enterHref = role ? `/welcome?role=${role}` : '/welcome';

  return (
    <div className="mp-landing" ref={rootRef}>
      {/* ===== ATMOSPHERE (fixed, 3 depth layers) ===== */}
      <div id="mpl-sky" />
      <div id="mpl-stars" aria-hidden="true">
        {STARS.map((s) => (
          <div
            key={s.key}
            className="star"
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
      <div id="mpl-moonAnchor" aria-hidden="true" ref={moonAnchorRef}>
        <div className="halo" />
        <div className="disc" />
      </div>
      <div id="mpl-clouds" aria-hidden="true" ref={cloudsRef}>
        {CLOUDFORMS.map((d, i) => (
          <div
            key={`cloudform-${i}`}
            className="cloudform"
            data-depth={d.depth}
            style={{ left: `${d.x}%`, top: `${d.y}%`, opacity: d.o }}
          >
            <svg width={d.w} height={Math.round(d.w * 0.45)} viewBox="0 0 200 90">
              <defs>
                <radialGradient id={`mpl-cg-${i}`} cx="0.4" cy="0.35" r="0.8">
                  <stop offset="0" stopColor="#fffdf8" />
                  <stop offset="1" stopColor="#e5dcc9" />
                </radialGradient>
              </defs>
              <path
                fill={`url(#mpl-cg-${i})`}
                d="M30 70 Q10 70 10 52 Q10 34 32 36 Q36 14 62 18 Q76 2 100 12 Q124 2 140 20 Q168 16 172 40 Q192 42 190 60 Q190 72 170 72 Z"
              />
            </svg>
          </div>
        ))}
      </div>
      <svg
        id="mpl-pathLayer"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mpl-pathGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f4e6c9" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f4e6c9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          ref={pathARef}
          d="M500 1000 C 500 820, 500 720, 500 560"
          stroke="url(#mpl-pathGrad)"
          strokeWidth="150"
          fill="none"
          strokeOpacity="0.5"
          style={{ filter: 'blur(30px)' }}
        />
        <path
          ref={pathBRef}
          d="M500 1000 C 500 820, 500 720, 500 560"
          stroke="#f7ecd2"
          strokeWidth="2"
          fill="none"
          strokeOpacity="0.35"
          strokeDasharray="2 12"
          style={{ filter: 'blur(.4px)' }}
        />
      </svg>
      <div id="mpl-mist" aria-hidden="true" ref={mistRef} />
      <div id="mpl-paperveil" aria-hidden="true" ref={paperveilRef} />
      <div id="mpl-wand" aria-hidden="true" ref={wandRef} />

      <div id="mpl-crossfade" aria-hidden="true" ref={crossfadeRef}>
        <div className="leaf l" />
        <div className="leaf r" />
        <div className="bloom" />
      </div>

      {/* ===== HEADER ===== */}
      <header className="site">
        <div className="brand">The Missing Peace</div>
        <nav aria-label="Primary">
          <a href="#compass">The Compass</a>
          <a href="#engine">The Engine</a>
          <Link href="/welcome">Enter</Link>
        </nav>
      </header>

      {/* ===== SECTION 1 — HERO / OPENING LANDSCAPE ===== */}
      <section className="hero" id="top" ref={heroRef}>
        <div className="hero-inner">
          <div className="threshold-stage">
            <button
              className="threshold"
              type="button"
              aria-label="Enter the Dream Walk — begin with the feeling"
              onMouseEnter={() => hoverGlow(true)}
              onMouseLeave={() => hoverGlow(false)}
              onFocus={() => hoverGlow(true)}
              onBlur={() => hoverGlow(false)}
              onClick={cross}
            >
              <svg viewBox="0 0 220 290" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="mpl-openingGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#f4e6c9" stopOpacity="0.9" />
                    <stop offset="0.6" stopColor="#e9d4ab" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#cdb79a" stopOpacity="0.1" />
                  </linearGradient>
                  <radialGradient id="mpl-haloGrad" cx="0.5" cy="0.68" r="0.6">
                    <stop offset="0" stopColor="#fff5e3" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#fff5e3" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse className="arch-glow" cx="110" cy="200" rx="80" ry="150" />
                <path
                  className="arch-inner"
                  d="M40 290 L40 118 C40 62 71 26 110 26 C149 26 180 62 180 118 L180 290 Z"
                />
                <path
                  className="arch-line"
                  d="M40 290 L40 118 C40 62 71 26 110 26 C149 26 180 62 180 118 L180 290"
                />
                <circle
                  className="thr-particle"
                  cx="90"
                  cy="250"
                  r="1.6"
                  style={{ animationDelay: '0s' }}
                />
                <circle
                  className="thr-particle"
                  cx="130"
                  cy="240"
                  r="1.3"
                  style={{ animationDelay: '.8s' }}
                />
                <circle
                  className="thr-particle"
                  cx="110"
                  cy="260"
                  r="1.5"
                  style={{ animationDelay: '1.5s' }}
                />
              </svg>
            </button>
          </div>

          <p className="eyebrow">Where the day begins</p>
          <h1>The Missing Peace</h1>
          <p className="lead">
            Start with how you want the day to feel. Then build everything around it.
          </p>
          <p className="sub">
            Before the budget, the guest list, and the thousand decisions, there is a feeling. Find
            it first.
          </p>

          <div className="cta-row">
            <button className="cta" type="button" onClick={cross}>
              Begin with the feeling{' '}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </button>
            <span className="utility">For couples and planners. Explore freely.</span>
          </div>

          <div className="roles" role="group" aria-label="I'm arriving as">
            <div className="roles-label">I&apos;m arriving as…</div>
            <div className="role-opts">
              <button
                className="role"
                type="button"
                aria-pressed={role === 'couple'}
                onClick={() => chooseRole('couple')}
              >
                A couple
              </button>
              <button
                className="role"
                type="button"
                aria-pressed={role === 'planner'}
                onClick={() => chooseRole('planner')}
              >
                A planner <span className="soon">Scaffolded</span>
              </button>
              <button
                className="role"
                type="button"
                aria-pressed={role === 'dreamer'}
                onClick={() => chooseRole('dreamer')}
              >
                A dreamer
              </button>
            </div>
            <p
              className={`role-note${role ? ' show' : ''}${role === 'planner' ? ' scaffold-note' : ''}`}
              aria-live="polite"
            >
              {role ? ROLE_NOTES[role] : ''}
            </p>
          </div>
        </div>

        <div className="scrollcue" aria-hidden="true">
          <span>Walk toward it</span>
          <span className="line" />
        </div>
      </section>

      {/* ===== SECTION 3 — DREAM WALK ===== */}
      <section className="dreamwalk" id="dreamwalk" ref={dreamwalkRef}>
        <p className="eyebrow reveal" style={{ color: 'var(--gold-soft)' }}>
          The Dream Walk
        </p>
        <h2 className="reveal d1">Walk toward the feeling you want to keep.</h2>
        <p className="sub reveal d2">
          The first step is not choosing a color or booking a venue. It is noticing what you want the
          day to feel like. The Dream Walk turns that feeling into a direction.
        </p>

        <div className="markers">
          <div className="marker reveal">
            <div className="dot">1</div>
            <div className="m-body">
              <div className="m-title">Notice the feeling</div>
              <div className="m-sub">Sit with the day as you imagine it, before any decisions.</div>
            </div>
          </div>
          <div className="marker reveal">
            <div className="dot">2</div>
            <div className="m-body">
              <div className="m-title">Name what matters</div>
              <div className="m-sub">
                Give words to the people, moments, and atmosphere you want to hold.
              </div>
            </div>
          </div>
          <div className="marker reveal">
            <div className="dot">3</div>
            <div className="m-body">
              <div className="m-title">Carry it into the day</div>
              <div className="m-sub">Let that direction shape every choice that follows.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PAPER WORLD (cream) ===== */}
      <div className="paper-world" ref={paperWorldRef}>
        {/* SECTION 2 — CHAPTER ONE */}
        <section className="chapter" id="chapter">
          <div className="chapter-card reveal">
            <p className="eyebrow">Chapter One</p>
            <h2>The night we agreed to build a world.</h2>
            <p>
              There is a room where two people begin to plan a life. It is not a spreadsheet. It is
              not a checklist. It is a moonlit study, and every choice is a small vow made twice —
              once quietly to yourself, and once, out loud, to the person you love.
            </p>
            <p className="q">What if the tool you used to plan the day felt like the day?</p>
            <div className="foot">From The Missing Peace</div>
            <div className="sig">for R.</div>
          </div>
        </section>

        {/* SECTION 4 — ONE ENGINE, FOUR LAYERS */}
        <section className="layers" id="engine">
          <p className="eyebrow reveal">One engine · Four layers</p>
          <h2 className="reveal d1">Start with the feeling. Build the day around it.</h2>
          <p className="sub reveal d2">
            The Missing Peace keeps the meaning of the wedding connected to the work of planning it.
          </p>
          <div className="layer-grid">
            <div className="layer-card reveal">
              <div className="arc" />
              <div className="num">01</div>
              <h3>Dream</h3>
              <div className="q">What should the day feel like?</div>
              <p>
                Begin with the emotions, memories, people, and atmosphere you want the wedding to
                hold.
              </p>
            </div>
            <div className="layer-card reveal d1">
              <div className="arc" />
              <div className="num">02</div>
              <h3>Compass</h3>
              <div className="q">What matters most?</div>
              <p>
                The Wedding Compass turns those feelings into a clear direction for every part of the
                celebration.
              </p>
            </div>
            <div className="layer-card reveal d2">
              <div className="arc" />
              <div className="num">03</div>
              <h3>Engine</h3>
              <div className="q">What needs to happen next?</div>
              <p>The engine turns your direction into decisions, actions, reminders, and progress.</p>
            </div>
            <div className="layer-card reveal d3">
              <div className="arc" />
              <div className="num">04</div>
              <h3>World</h3>
              <div className="q">What will your guests actually experience?</div>
              <p>
                Shape the food, atmosphere, attire, timeline, people, and details around the feeling
                you chose.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5 — WEDDING COMPASS */}
        <section className="compass-sec" id="compass">
          <p className="eyebrow reveal">A peek inside · The Compass</p>
          <h2 className="reveal d1">Bring what matters closer.</h2>
          <p className="sub reveal d2">
            Each Dream Cloud represents something you want the day to hold. Bring a cloud closer to
            the moon and watch it become part of your Wedding Compass.
          </p>

          <div className="board" id="board" ref={boardRef}>
            <div className="touchhint">Touch and drag a cloud toward the moon.</div>
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
              <defs>
                <linearGradient id="mpl-gp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FFFDF9" />
                  <stop offset="1" stopColor="#F1EBDD" />
                </linearGradient>
                <linearGradient id="mpl-gg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FCF4E0" />
                  <stop offset="1" stopColor="#EEDFBB" />
                </linearGradient>
                <linearGradient id="mpl-gs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F2F6ED" />
                  <stop offset="1" stopColor="#DBE5D1" />
                </linearGradient>
                <linearGradient id="mpl-gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FBEAE1" />
                  <stop offset="1" stopColor="#EFCBBA" />
                </linearGradient>
                <linearGradient id="mpl-gb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#EEF3F6" />
                  <stop offset="1" stopColor="#D3DFE7" />
                </linearGradient>
                <linearGradient id="mpl-gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FBECE6" />
                  <stop offset="1" stopColor="#F0D6C9" />
                </linearGradient>
              </defs>
            </svg>

            <div className="season-tint" style={{ background: seasonTint }} />

            {TWINKLES.map((t) => (
              <span
                key={t.key}
                className="twinkle"
                style={{
                  fontSize: `${t.size}px`,
                  left: `${t.left}%`,
                  top: `${t.top}%`,
                  animationDelay: `${t.delay}s`,
                }}
              >
                ✦
              </span>
            ))}

            <div
              className="board-moon"
              aria-hidden="true"
              ref={boardMoonRef}
              style={{ left: `${c0.x}px`, top: `${c0.y}px` }}
            >
              <div className="m-disc">
                <div className="m-shade" />
                <div className="m-aura" style={{ background: light.aura }} />
                <div className="m-label">Wedding Compass</div>
                <div className="m-star">✦</div>
                <div className="m-read">{shortReading}</div>
                <div className="m-cue">{light.cap}</div>
              </div>
            </div>

            {rankedClouds.map((entry) => {
              const { cloud, index, priority: p, label } = entry;
              const pos = positions[cloud.id];
              const m = cloudMetrics(index, p);
              return (
                <div
                  key={cloud.id}
                  className="dcloud"
                  data-cloud={cloud.id}
                  tabIndex={0}
                  role="button"
                  aria-label={cloudAriaLabel(cloud, label)}
                  onPointerDown={(e) => startDrag(cloud.id, e)}
                  onKeyDown={(e) => onCloudKeyDown(cloud.id, e)}
                  style={{
                    left: `${c0.x}px`,
                    top: `${c0.y}px`,
                    width: `${m.width}px`,
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                    zIndex: draggingId === cloud.id ? 40 : m.zIndex,
                  }}
                >
                  <div
                    className="float"
                    style={{ animationDuration: m.floatDuration, animationDelay: m.floatDelay }}
                  >
                    <svg
                      className="cloudsvg"
                      viewBox="0 0 260 170"
                      aria-hidden="true"
                      style={{ height: `${m.svgHeight}px` }}
                    >
                      <g fill={`url(#mpl-${cloud.grad})`}>
                        <rect x="24" y="106" width="212" height="40" rx="20" />
                        <circle cx="60" cy="106" r="34" />
                        <circle cx="96" cy="82" r="41" />
                        <circle cx="138" cy="64" r="47" />
                        <circle cx="184" cy="80" r="41" />
                        <circle cx="216" cy="106" r="30" />
                        <circle cx="120" cy="102" r="45" />
                        <circle cx="172" cy="106" r="41" />
                        <circle cx="80" cy="115" r="30" />
                        <circle cx="202" cy="118" r="26" />
                      </g>
                    </svg>
                    <span className="spark s1" style={{ opacity: m.sparkOpacity }}>
                      ✦
                    </span>
                    <span className="spark s2" style={{ opacity: m.sparkOpacity }}>
                      ✦
                    </span>
                    <span className="cloud-text">
                      <span className="type" style={{ fontSize: `${m.typeSize}px` }}>
                        {cloud.type}
                      </span>
                      <span className="label" style={{ fontSize: `${m.labelSize}px` }}>
                        {cloud.label}
                      </span>
                      <span
                        className="rank"
                        style={{ fontSize: `${m.rankSize}px`, color: m.rankColor }}
                      >
                        {label}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="readout reveal">
            <div>
              <div className="r-label">Your Wedding Compass</div>
              <div className="r-text" aria-live="polite">
                {longReading}
              </div>
            </div>
            <div className="r-side">
              <a className="cta ghost" href="#begin">
                Continue into the plan{' '}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </div>
          </div>
          <p className="helper reveal">
            Bring the clouds closer. The day will show you what matters most.
          </p>
        </section>

        {/* SECTION 6 — PRACTICAL ENGINE */}
        <section className="practical" id="practical">
          <h2 className="reveal">Once the feeling is clear, the planning gets easier.</h2>
          <p className="sub reveal d1">
            The Missing Peace connects the emotional direction of the wedding to the decisions that
            make it real.
          </p>
          <div className="translations">
            <div className="trans reveal">
              <div className="from">
                <div className="k">Dream</div>
                <div className="v">Family at the center</div>
              </div>
              <div className="conn" aria-hidden="true">
                →
              </div>
              <div className="to">
                Build a generous shared table, protect time for the people who matter, and keep the
                evening open for dancing.
              </div>
            </div>
            <div className="trans reveal d1">
              <div className="from">
                <div className="k">Dream</div>
                <div className="v">Ease and calm</div>
              </div>
              <div className="conn" aria-hidden="true">
                →
              </div>
              <div className="to">
                Create a realistic timeline, assign ownership, and remove decisions from the
                couple&apos;s hands on the day.
              </div>
            </div>
            <div className="trans reveal d2">
              <div className="from">
                <div className="k">Dream</div>
                <div className="v">Soft natural beauty</div>
              </div>
              <div className="conn" aria-hidden="true">
                →
              </div>
              <div className="to">
                Carry the same atmosphere through the venue, lighting, flowers, attire, and
                tablescape.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — THE WEAVER */}
        <section className="weaver" id="weaver">
          <div className="vowcard reveal">
            <p className="eyebrow">The Weaver</p>
            <h2>When the feeling is clear, the words come easier.</h2>
            <p className="thread">
              The Weaver helps you turn what matters into language that sounds like you.
            </p>
            <p className="hand">…the people we love, at the center.</p>
            <a className="cta ghost" href="#begin">
              Meet the Weaver{' '}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="finalcta" id="begin">
          <h2 className="reveal">Build the world your love will walk into.</h2>
          <p className="sub reveal d1">
            Start with what you want the day to feel like. The rest can take shape from there.
          </p>
          <Link className="cta reveal d1" href={enterHref}>
            Begin your Dream Walk{' '}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <p className="utility reveal d2">Explore freely.</p>
        </section>

        <footer className="site">
          <div className="fbrand">The Missing Peace</div>
          <div>
            For couples and planners · <Link href="/privacy">Privacy</Link> ·{' '}
            <Link href="/terms">Terms</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default HomeLanding;
