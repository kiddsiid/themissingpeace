'use client';

import * as React from 'react';
import { Chip } from '@/design-system';
import { track } from '@/lib/analytics';

export interface RippleImpact {
  area: string;
  note?: string;
  severity?: string;
}

export interface RippleRow {
  id: string;
  source_type: string;
  change_kind: string;
  summary?: string | null;
  impact_json?: RippleImpact[] | null;
  created_at?: string | null;
}

function impactTone(severity?: string): 'clay' | 'gold' | 'sage' | 'neutral' {
  const value = String(severity ?? '').toLowerCase();
  if (value === 'high' || value === 'critical') return 'clay';
  if (value === 'med' || value === 'medium') return 'gold';
  if (value === 'low') return 'sage';
  return 'neutral';
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export function RippleFeed({ ripples }: { ripples: RippleRow[] }) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const tracked = React.useRef(false);

  React.useEffect(() => {
    const node = panelRef.current;
    if (!node || tracked.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || tracked.current) return;
      tracked.current = true;
      track('ripple_viewed', { sourceType: ripples[0]?.source_type }, { surface: 'client' });
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ripples]);

  if (!ripples.length) {
    return (
      <div ref={panelRef}>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          Changes you make will show their ripples here.
        </p>
      </div>
    );
  }

  return (
    <div ref={panelRef}>
      <ul className="mt-3 space-y-2">
        {ripples.map((ripple) => {
          const impacts = Array.isArray(ripple.impact_json) ? ripple.impact_json : [];
          return (
            <li key={ripple.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--ink)]">
                  {ripple.summary || `${ripple.source_type} ${ripple.change_kind}`}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--ink-soft)]">
                  {timeAgo(ripple.created_at)}
                </span>
              </div>
              {impacts.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-[var(--ink-soft)]">Rippled to</span>
                  {impacts.map((impact, index) => (
                    <Chip
                      key={`${impact.area}-${index}`}
                      tone={impactTone(impact.severity)}
                      title={impact.note}
                    >
                      {impact.area.replace(/_/g, ' ')}
                    </Chip>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
