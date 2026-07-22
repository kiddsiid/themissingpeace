'use client';
import * as React from 'react';
import { Check, Clock, X } from 'lucide-react';
import { Button, Chip } from '@/design-system';
import { setRecommendationStatus } from '@/app/(app)/peace-center/actions';
import type { Citation } from '@/lib/engine/weaver';

const CITE_LABEL: Record<string, string> = {
  board_item: 'Board', budget_item: 'Budget', vendor: 'Vendor', decision: 'Decision',
  task: 'Task', compass: 'Compass', fact: 'Fact',
};

/**
 * Weaver insight controls (P5): shows what an insight is grounded in (citation chips)
 * and lets a planner accept / defer / dismiss it. Each action persists + is audited
 * server-side (see setRecommendationStatus). Optimistic done-state; a11y labelled.
 */
export function InsightActions({
  recId,
  citations = [],
  source = 'ai',
}: {
  recId: string;
  citations?: Citation[];
  source?: string;
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

  return (
    <div className="mt-3">
      {citations.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Based on {source === 'deterministic' ? 'the numbers' : 'your plan'}
          </p>
          <div className="flex flex-wrap gap-1">
            {citations.map((c, i) => (
              <Chip key={`${c.type}-${c.id ?? i}`} tone={source === 'deterministic' ? 'sage' : 'gold'}>
                {CITE_LABEL[c.type] ?? c.type}
                {c.label ? `: ${c.label}` : ''}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" isLoading={pending} onClick={() => act('accepted')} leadingIcon={<Check className="h-3.5 w-3.5" />}>
          Accept
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act('deferred')} leadingIcon={<Clock className="h-3.5 w-3.5" />}>
          Later
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act('dismissed')} leadingIcon={<X className="h-3.5 w-3.5" />}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
