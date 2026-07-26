'use client';
import * as React from 'react';
import { Check, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { Button, Chip } from '@/design-system';
import { setRecommendationStatus } from '@/app/(app)/peace-center/actions';
import type { Citation } from '@/lib/engine/weaver';

const CITE_LABEL: Record<string, string> = {
  board_item: 'Board', budget_item: 'Budget', vendor: 'Vendor', decision: 'Decision',
  task: 'Task', compass: 'Compass', fact: 'Fact',
};

function citationHref(citation: Citation): string | null {
  if (citation.type === 'compass') return '/dream#compass';
  if (citation.type === 'fact') return null;
  if (!citation.id) return null;
  const encoded = encodeURIComponent(citation.id);
  if (citation.type === 'board_item') return `/board?item=${encoded}`;
  if (citation.type === 'budget_item') return `/budget?item=${encoded}`;
  if (citation.type === 'vendor') return `/vendors?vendor=${encoded}`;
  if (citation.type === 'decision') return `/decisions?decision=${encoded}`;
  if (citation.type === 'task') return `/timeline?task=${encoded}`;
  return null;
}

/**
 * Weaver insight controls (P5): shows what an insight is grounded in (citation chips)
 * and lets a planner accept / defer / dismiss it. Each action persists + is audited
 * server-side (see setRecommendationStatus). Optimistic done-state; a11y labelled.
 */
export function InsightActions({
  recId,
  citations = [],
  source = 'ai',
  reason,
}: {
  recId: string;
  citations?: Citation[];
  source?: string;
  reason?: string | null;
}) {
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState<string | null>(null);

  const act = (status: 'accepted' | 'deferred' | 'dismissed') =>
    startTransition(async () => {
      try {
        await setRecommendationStatus(recId, status);
        setDone(status);
      } catch {
        /* server action revalidates; leave controls interactive on failure */
      }
    });

  if (done) {
    const word = done === 'accepted' ? 'Accepted' : done === 'deferred' ? 'Deferred' : 'Dismissed';
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--ink-soft)]" role="status">
        <Check className="h-3.5 w-3.5 text-[var(--sage)]" aria-hidden /> {word}
      </p>
    );
  }

  const sourceLabel = source === 'deterministic' ? 'Deterministic' : 'AI, cited';

  return (
    <div className="mt-3">
      {citations.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Based on {source === 'deterministic' ? 'the numbers' : 'your plan'}
          </p>
          <div className="flex flex-wrap gap-1">
            {citations.map((citation, index) => {
              const chip = (
                <Chip tone={source === 'deterministic' ? 'sage' : 'gold'}>
                  {citation.label || CITE_LABEL[citation.type] || citation.type}
                </Chip>
              );
              const href = citationHref(citation);
              return href ? (
                <Link
                  key={`${citation.type}-${citation.id ?? index}`}
                  href={href}
                  className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                  aria-label={`Open cited ${CITE_LABEL[citation.type] ?? citation.type}: ${citation.label ?? citation.id}`}
                >
                  {chip}
                </Link>
              ) : (
                <span key={`${citation.type}-${citation.id ?? index}`}>{chip}</span>
              );
            })}
          </div>
        </div>
      )}
      <details className="mb-3 rounded-[10px] border border-[var(--line)] bg-[var(--cream)]/45 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]">
          Why this?
        </summary>
        <div className="mt-2 space-y-2 text-xs leading-5 text-[var(--ink-soft)]">
          <p>{reason || 'This insight is grounded in the planning evidence shown below.'}</p>
          <p><span className="font-medium text-[var(--ink)]">Source:</span> {sourceLabel}</p>
          {citations.length > 0 && (
            <ul className="list-disc space-y-1 pl-4">
              {citations.map((citation, index) => (
                <li key={`why-${citation.type}-${citation.id ?? index}`}>
                  {citation.label || CITE_LABEL[citation.type] || citation.type}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" isLoading={pending} onClick={() => act('accepted')} leadingIcon={<Check className="h-3.5 w-3.5" />}>
          Accept
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act('deferred')} leadingIcon={<Clock className="h-3.5 w-3.5" />}>
          Defer
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act('dismissed')} leadingIcon={<X className="h-3.5 w-3.5" />}>
          {source === 'deterministic' ? 'Acknowledge' : 'Dismiss'}
        </Button>
      </div>
    </div>
  );
}
