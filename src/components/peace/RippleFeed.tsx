import * as React from 'react';

// Presentational (server-renderable): the ripple feed for Peace Center (P5).
// Shows recent changes and the areas they touched. Pure props; no client hooks.

export interface RippleImpact { area: string; note?: string; severity?: string }
export interface RippleRow {
  id: string;
  source_type: string;
  change_kind: string;
  summary?: string | null;
  impact_json?: RippleImpact[] | null;
  created_at?: string | null;
}

const AREA_TONE: Record<string, string> = {
  budget: 'bg-[var(--gold-bg)] text-[var(--ink)]',
  seating: 'bg-[var(--sage-bg)] text-[var(--ink)]',
  timeline: 'bg-[var(--cream)] text-[var(--ink-soft)]',
  vendors: 'bg-[var(--cream)] text-[var(--ink-soft)]',
  guests: 'bg-[var(--sage-bg)] text-[var(--ink)]',
  canvas: 'bg-[var(--clay-bg)] text-[var(--clay-ink)]',
  dream: 'bg-[var(--gold-bg)] text-[var(--ink)]',
  decisions: 'bg-[var(--cream)] text-[var(--ink-soft)]',
  honeymoon: 'bg-[var(--sage-bg)] text-[var(--ink)]',
};

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export function RippleFeed({ ripples }: { ripples: RippleRow[] }) {
  if (!ripples || ripples.length === 0) {
    return <p className="mt-3 text-sm text-[var(--ink-soft)]">No ripples yet — changes you make will show their downstream effects here.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {ripples.map((r) => {
        const impacts = Array.isArray(r.impact_json) ? r.impact_json : [];
        return (
          <li key={r.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--ink)]">{r.summary || `${r.source_type} ${r.change_kind}`}</span>
              <span className="shrink-0 text-[11px] text-[var(--ink-soft)]">{timeAgo(r.created_at)}</span>
            </div>
            {impacts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[11px] text-[var(--ink-soft)]">Rippled to</span>
                {impacts.map((im, i) => (
                  <span
                    key={`${im.area}-${i}`}
                    title={im.note}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${AREA_TONE[im.area] ?? 'bg-[var(--cream)] text-[var(--ink-soft)]'}`}
                  >
                    {im.area}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
