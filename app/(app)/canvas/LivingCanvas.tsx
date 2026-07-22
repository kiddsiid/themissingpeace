'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { tint, shade } from '@/lib/canvas/color';
import type { RoomProgress } from '@/lib/canvas/progress';
import type { Inspiration, RoomKey } from '@/lib/canvas/types';

interface Props {
  projectName: string;
  compassSentence: string;
  palette: string[];
  approverRoles: string[];
  inspirations: Inspiration[];
  progress: { feast: RoomProgress; atmosphere: RoomProgress; atelier: RoomProgress };
  peace: { score: number; band: string };
}

const ROOM_META: Record<RoomKey, {
  href: string; kicker: string; name: string; promise: string; cta: string; wash: string;
}> = {
  feast: { href: '/canvas/feast', kicker: 'The table', name: 'Feast Studio', promise: 'Build a meal every guest can enter, understand, and enjoy.', cta: 'Enter the Feast', wash: '#8A4A33' },
  atmosphere: { href: '/canvas/atmosphere', kicker: 'The feeling', name: 'Atmosphere Lab', promise: 'Design the feeling before anyone says a word.', cta: 'Enter the Lab', wash: '#566049' },
  atelier: { href: '/canvas/atelier', kicker: 'The story worn', name: 'The Atelier', promise: 'Design the story your love will wear.', cta: 'Enter the Atelier', wash: '#7C5470' },
};

const PRESENCE_COLORS = ['#BC7459', '#7C93A6', '#8A9A80'];
const TAG_DOT: Record<string, string> = {
  Hospitality: '#8A9A80', Atmosphere: '#B8924A', Feeling: '#BC7459', Attire: '#A1748F', Aesthetic: '#C98BA0',
};
const ROOM_NAME: Record<RoomKey, string> = { feast: 'Feast Studio', atmosphere: 'Atmosphere Lab', atelier: 'The Atelier' };

function RoomMotif({ room, c }: { room: RoomKey; c: string[] }) {
  const abs: React.CSSProperties = { position: 'absolute' };
  const bandBase: React.CSSProperties = { position: 'relative', height: 158, overflow: 'hidden' };

  if (room === 'feast') {
    return (
      <div className="lc-band" style={{ ...bandBase, background: `linear-gradient(180deg, ${tint(c[3], 0.5)}, ${tint(c[2], 0.55)})` }}>
        <div style={{ ...abs, left: 0, right: 0, top: 82, height: 26, background: c[0] }} />
        <div className="lc-drift" style={{ ...abs, left: 'calc(50% - 23px)', top: 36, width: 46, height: 46, borderRadius: '50%', background: tint(c[3], 0.9), border: `3px solid ${c[2]}`, animation: 'lc-float 5s ease-in-out infinite' }} />
        <div style={{ ...abs, left: '50%', top: 24, transform: 'translate(-50%,0)', width: 16, height: 22, borderRadius: '50%', filter: 'blur(4px)', background: 'rgba(255,251,240,.7)', animation: 'lc-steam 4s ease-in-out infinite' }} />
        <div style={{ ...abs, left: '26%', top: 48, width: 5, height: 34, borderRadius: 3, background: c[2], boxShadow: `0 0 12px ${c[2]}`, transformOrigin: '50% 100%', animation: 'lc-flicker 2.2s ease-in-out infinite' }} />
        <div style={{ ...abs, right: '26%', top: 48, width: 5, height: 34, borderRadius: 3, background: c[2], boxShadow: `0 0 12px ${c[2]}`, transformOrigin: '50% 100%', animation: 'lc-flicker 2.6s ease-in-out .5s infinite' }} />
      </div>
    );
  }
  if (room === 'atmosphere') {
    return (
      <div className="lc-band" style={{ ...bandBase, background: tint(c[2], 0.4) }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...abs, left: `${i * 20}%`, top: 0, bottom: 0, width: '20%', background: c[i] }} />
        ))}
        <div className="lc-drift" style={{ ...abs, right: 20, top: 22, width: 44, height: 44, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #FFFDF9, ${tint(c[2], 0.5)})`, animation: 'lc-glow 4s ease-in-out infinite, lc-float 6s ease-in-out infinite' }} />
      </div>
    );
  }
  return (
    <div className="lc-band" style={{ ...bandBase, background: `linear-gradient(180deg, ${tint(c[3], 0.55)}, ${tint(c[3], 0.3)})` }}>
      <div style={{ ...abs, left: '50%', top: 24, transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#E4CBB4', zIndex: 2 }} />
      <div className="lc-drift" style={{ ...abs, left: '50%', top: 42, transform: 'translateX(-50%)', width: 58, height: 96, background: c[1], clipPath: 'polygon(40% 0,60% 0,100% 100%,0 100%)', transformOrigin: '50% 0', animation: 'lc-sway 4.5s ease-in-out infinite' }} />
      <div style={{ ...abs, left: '50%', top: 50, transform: 'translateX(-50%)', width: 7, height: 70, background: c[2], transformOrigin: '50% 0', animation: 'lc-sway 4.5s ease-in-out infinite' }} />
    </div>
  );
}

function Ring({ pct, aligned }: { pct: number; aligned: boolean }) {
  const col = aligned ? 'var(--sage)' : 'var(--gold)';
  return (
    <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(${col} ${Math.round(pct * 3.6)}deg, #EEE9E0 0)` }}>
      <div className="voice" style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFFDFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
        {pct}%
      </div>
    </div>
  );
}

export function LivingCanvas({ projectName, compassSentence, palette, approverRoles, inspirations, progress, peace }: Props) {
  const router = useRouter();
  const c = palette.length >= 5 ? palette : ['#8A9A80', '#BC7459', '#E7D2C8', '#F1EBDD', '#3A3631'];
  const [entering, setEntering] = useState<null | { name: string; baseBg: string; burstBg: string }>(null);

  const enterRoom = (key: RoomKey) => {
    if (entering) return;
    const meta = ROOM_META[key];
    setEntering({
      name: meta.name,
      baseBg: shade(meta.wash, 0.35),
      burstBg: `radial-gradient(circle, ${tint(meta.wash, 0.45)}, ${meta.wash})`,
    });
    setTimeout(() => router.push(meta.href), 1050);
  };

  const rooms: { key: RoomKey; p: RoomProgress }[] = [
    { key: 'feast', p: progress.feast },
    { key: 'atmosphere', p: progress.atmosphere },
    { key: 'atelier', p: progress.atelier },
  ];

  return (
    <div
      className="-mx-6 -my-6 flex min-h-screen flex-col md:-mx-10"
      style={{ background: 'radial-gradient(120% 70% at 50% 0%, #FBF6EC 0%, #F7F4EE 52%, #F2ECE0 100%)' }}
    >
      <style>{`
        @keyframes lc-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lc-glow{0%,100%{opacity:.5;box-shadow:0 0 18px rgba(255,251,240,.5)}50%{opacity:.95;box-shadow:0 0 34px rgba(255,251,240,.85)}}
        @keyframes lc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes lc-flicker{0%,100%{opacity:.55;transform:translateY(0) scaleY(1)}45%{opacity:1;transform:translateY(-1px) scaleY(1.12)}70%{opacity:.75;transform:translateY(0) scaleY(.96)}}
        @keyframes lc-steam{0%{opacity:0;transform:translate(-50%,0) scaleX(1)}25%{opacity:.5}100%{opacity:0;transform:translate(-50%,-30px) scaleX(1.7)}}
        @keyframes lc-sway{0%,100%{transform:translateX(-50%) rotate(-2deg)}50%{transform:translateX(-50%) rotate(2deg)}}
        @keyframes lc-sheen{from{transform:translateX(-120%)}to{transform:translateX(120%)}}
        @keyframes lc-fadein{from{opacity:0}to{opacity:1}}
        @keyframes lc-bloom{0%{transform:translate(-50%,-50%) scale(.15);opacity:.85}100%{transform:translate(-50%,-50%) scale(11);opacity:1}}
        @keyframes lc-entertext{0%,38%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
        .lc-room{position:relative;display:flex;flex-direction:column;background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:20px;overflow:hidden;cursor:pointer;transition:transform .28s cubic-bezier(.34,1.4,.64,1),box-shadow .28s ease,border-color .28s ease;animation:lc-rise .6s cubic-bezier(.22,1,.36,1) both}
        .lc-room:hover{transform:translateY(-6px);box-shadow:0 26px 56px rgba(32,28,24,0.16);border-color:rgba(184,146,74,0.4)}
        .lc-room:hover .lc-enter{background:#8A4A33;gap:12px}
        .lc-band *{transition:transform .5s ease}
        .lc-room:hover .lc-band .lc-drift{transform:translateY(-4px)}
        .lc-band::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,0.4) 50%,transparent 58%);transform:translateX(-120%);pointer-events:none;z-index:5}
        .lc-room:hover .lc-band::after{animation:lc-sheen .9s ease}
        @media(prefers-reduced-motion:reduce){.lc-room{animation:none}.lc-room:hover{transform:none}.lc-band *{animation:none!important}}
      `}</style>

      {/* HEADER */}
      <header className="flex flex-shrink-0 items-center justify-between gap-4 px-[26px] py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/peace-center" className="voice whitespace-nowrap text-[22px] font-semibold text-[var(--ink)]">The Missing Peace</Link>
          <div className="h-[22px] w-px bg-[rgba(32,28,24,0.14)]" />
          <div className="flex min-w-0 flex-col leading-[1.1]">
            <span className="truncate text-[13px] font-semibold text-[var(--ink)]">{projectName}</span>
            <span className="text-[10px] uppercase tracking-[1.4px] text-[var(--gold)]">The Living Canvas</span>
          </div>
        </div>
        <div className="flex items-center gap-[14px]">
          <Link
            href="/peace-center"
            className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[rgba(138,154,128,0.4)] bg-[var(--sage-bg)] px-3 py-[5px] text-[11.5px] text-[var(--sage)]"
          >
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--sage)]" />
            Peace · {peace.band}
          </Link>
          <div className="flex items-center">
            {approverRoles.slice(0, 3).map((role, i) => (
              <div
                key={role}
                title={role}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-[#FBF6EC] text-[11px] font-bold text-[#FFFDFC]"
                style={{ background: PRESENCE_COLORS[i % PRESENCE_COLORS.length], marginLeft: i ? -8 : 0 }}
              >
                {role.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="mx-auto max-w-[820px] flex-shrink-0 px-6 pb-5 pt-[26px] text-center">
        <div className="text-[11px] uppercase tracking-[3.6px] text-[var(--gold)]">Where forever takes shape</div>
        <div className="voice mt-3 text-[clamp(34px,5vw,58px)] leading-[1.02] text-[var(--ink)]">
          Build the world <span className="italic text-[var(--gold)]">your love</span> will walk into.
        </div>
        <div className="mt-[18px] flex items-center justify-center gap-[14px]">
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,rgba(32,28,24,0.2))' }} />
          <span className="voice max-w-[600px] text-[clamp(16px,2vw,20px)] italic text-[var(--ink-soft)]">{compassSentence}</span>
          <span className="h-px w-10" style={{ background: 'linear-gradient(270deg,transparent,rgba(32,28,24,0.2))' }} />
        </div>
        <div className="mt-[14px] text-[12px] text-[var(--ink-faint)]">Choose a room to shape — everything you make flows back into one wedding world.</div>
      </div>

      {/* ROOM CARDS */}
      <div className="flex flex-1 items-start justify-center px-[26px] pb-[30px] pt-[14px]">
        <div className="grid w-full max-w-[1120px] grid-cols-1 gap-[22px] min-[760px]:grid-cols-2 min-[1000px]:grid-cols-3">
          {rooms.map(({ key, p }, i) => {
            const meta = ROOM_META[key];
            return (
              <div
                key={key}
                role="link"
                tabIndex={0}
                aria-label={meta.cta}
                className="lc-room"
                style={{ animationDelay: `${0.16 + i * 0.08}s` }}
                onClick={() => enterRoom(key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterRoom(key); } }}
              >
                <RoomMotif room={key} c={c} />
                <div className="flex flex-1 flex-col p-[20px_22px_22px]">
                  <div className="text-[10px] uppercase tracking-[1.6px] text-[var(--gold)]">{meta.kicker}</div>
                  <div className="voice mt-[5px] text-[28px] font-semibold leading-[1.05] text-[var(--ink)]">{meta.name}</div>
                  <div className="voice mt-2 flex-1 text-[16px] italic leading-[1.35] text-[var(--ink-soft)]">{meta.promise}</div>
                  <div className="mt-[18px] flex items-center gap-3">
                    <Ring pct={p.pct} aligned={p.aligned} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-[var(--ink)]">{p.statusLabel}</div>
                      <div className="text-[11px] text-[var(--ink-soft)]">{p.statusSub}</div>
                    </div>
                  </div>
                  <div className="lc-enter mt-[18px] inline-flex items-center justify-center gap-2 rounded-full bg-[var(--clay)] px-[18px] py-[11px] text-[13px] font-semibold text-[#FFFDFC] transition-[background,gap] duration-200">
                    {meta.cta} <span>→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DREAM DRAWER */}
      <div className="flex-shrink-0 border-t border-[rgba(32,28,24,0.12)] bg-[#FBF8F2] px-[26px] pb-[22px] pt-4">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-[10px]">
              <span className="voice text-[19px] font-semibold text-[var(--ink)]">Dream Drawer</span>
              <span className="text-[11.5px] text-[var(--ink-soft)]">the sparks waiting to become real</span>
            </div>
            <Link href="/dream" className="text-[12px] text-[var(--clay-ink)]">Open the full Dream →</Link>
          </div>
          <div className="flex gap-[9px] overflow-x-auto pb-1">
            {inspirations.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => enterRoom(d.room)}
                className="flex min-w-[170px] flex-shrink-0 flex-col gap-[3px] rounded-[12px] border border-[rgba(32,28,24,0.12)] bg-[#FFFDFC] p-[10px_12px] text-left"
              >
                <div className="flex items-center gap-[7px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: TAG_DOT[d.tag] ?? 'var(--gold)' }} />
                  <span className="text-[9.5px] uppercase tracking-[1px] text-[var(--gold)]">{d.tag}</span>
                </div>
                <div className="voice text-[16px] font-semibold leading-[1.15] text-[var(--ink)]">{d.title}</div>
                <div className="text-[11px] text-[var(--ink-soft)]">Open in {ROOM_NAME[d.room]} →</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ROOM ENTRANCE TRANSITION */}
      {entering && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden"
          style={{ background: entering.baseBg, animation: 'lc-fadein .3s ease both' }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[220px] w-[220px] rounded-full"
            style={{ background: entering.burstBg, animation: 'lc-bloom 1s cubic-bezier(.55,0,.28,1) both' }}
          />
          <div className="relative text-center" style={{ animation: 'lc-entertext 1.1s ease both' }}>
            <div className="text-[11px] uppercase tracking-[3.8px] text-[rgba(255,251,240,.82)]">Stepping into</div>
            <div className="voice mt-2 text-[clamp(36px,6vw,66px)] font-semibold leading-[1.05] text-[#FFFDF9]">{entering.name}</div>
            <div className="mt-[6px] text-[20px] text-[rgba(255,251,240,.85)]">✦</div>
          </div>
        </div>
      )}
    </div>
  );
}
